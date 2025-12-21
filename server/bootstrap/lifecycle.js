'use strict';

// Lazy-load transaction context to avoid bundling issues
let transactionCtx = null;
function getTransactionCtx() {
	if (!transactionCtx) {
		try {
			transactionCtx = require('@strapi/database/dist/transaction-context').transactionCtx;
		} catch (error) {
			console.warn('[@strapi-community/plugin-io] Unable to access transaction context:', error.message);
			transactionCtx = { get: () => null, onCommit: () => {} }; // Fallback noop
		}
	}
	return transactionCtx;
}

const { pluginId } = require('../utils/pluginId');

/**
 * Run callback after the current transaction commits (if any).
 * Falls back to a plain setTimeout when no transaction is active.
 */
function scheduleAfterTransaction(callback, delay = 0) {
	const runner = () => setTimeout(callback, delay);
	const ctx = getTransactionCtx();
	if (ctx.get()) {
		ctx.onCommit(runner);
	} else {
		runner();
	}
}

/**
 * Check if action is enabled for a content type
 * Reads from strapi.$ioSettings which is updated on settings change
 */
function isActionEnabled(strapi, uid, action) {
	const settings = strapi.$ioSettings || {};
	const rolePermissions = settings.rolePermissions || {};
	
	// Check if ANY role has this action enabled for this content type
	for (const rolePerms of Object.values(rolePermissions)) {
		if (rolePerms.contentTypes?.[uid]?.[action] === true) {
			return true;
		}
	}
	return false;
}

/**
 * Bootstrap lifecycles
 *
 * @param {*} params
 * @param {*} params.strapi
 */
async function bootstrapLifecycles({ strapi }) {
	// Get content types from stored settings (set by bootstrapIO)
	const settings = strapi.$ioSettings || {};
	const rolePermissions = settings.rolePermissions || {};

	// Merge all role permissions to get all enabled content types
	const allContentTypes = {};
	Object.values(rolePermissions).forEach((rolePerms) => {
		if (rolePerms.contentTypes) {
			Object.entries(rolePerms.contentTypes).forEach(([uid, actions]) => {
				if (!allContentTypes[uid]) {
					allContentTypes[uid] = { create: false, update: false, delete: false };
				}
				// Enable action if ANY role has it enabled
				if (actions.create) allContentTypes[uid].create = true;
				if (actions.update) allContentTypes[uid].update = true;
				if (actions.delete) allContentTypes[uid].delete = true;
			});
		}
	});

	// Get all UIDs that have at least one action enabled
	const enabledUids = Object.entries(allContentTypes)
		.filter(([uid, actions]) => actions.create || actions.update || actions.delete)
		.map(([uid]) => uid);

	enabledUids.forEach((uid) => {
		const subscriber = {
			models: [uid],
		};

		// CREATE - check dynamically if enabled
		subscriber.afterCreate = async (event) => {
			if (!isActionEnabled(strapi, uid, 'create')) return;
			// Skip if no result data
			if (!event.result) {
				strapi.log.debug(`socket.io: No result data in afterCreate for ${uid}`);
				return;
			}
			// Clone data to avoid transaction context issues
			try {
				const eventData = {
					event: 'create',
					schema: event.model,
					data: JSON.parse(JSON.stringify(event.result)), // Deep clone
				};
				// Schedule emission after transaction commit
				scheduleAfterTransaction(() => {
					try {
						strapi.$io.emit(eventData);
					} catch (error) {
						strapi.log.error(`socket.io: Could not emit create event for ${uid}:`, error.message);
					}
				});
			} catch (error) {
				strapi.log.error(`socket.io: Error cloning create event data for ${uid}:`, error.message);
			}
		};
		subscriber.afterCreateMany = async (event) => {
			if (!isActionEnabled(strapi, uid, 'create')) return;
			const query = buildEventQuery({ event });
			if (query.filters) {
				// Clone query to avoid transaction context issues
				const clonedQuery = JSON.parse(JSON.stringify(query));
				const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
				// Schedule query after transaction commit
				scheduleAfterTransaction(async () => {
					try {
						// Use Document Service API (Strapi v5)
						const records = await strapi.documents(uid).findMany(clonedQuery);
						records.forEach((r) => {
							strapi.$io.emit({
								event: 'create',
								schema: { singularName: modelInfo.singularName, uid: modelInfo.uid },
								data: r,
							});
						});
					} catch (error) {
						strapi.log.debug(`socket.io: Could not fetch records in afterCreateMany for ${uid}:`, error.message);
					}
				}, 50);
			}
		};

		// UPDATE - check dynamically if enabled
		subscriber.afterUpdate = async (event) => {
			if (!isActionEnabled(strapi, uid, 'update')) return;
			// Clone data to avoid transaction context issues
			const eventData = {
				event: 'update',
				schema: event.model,
				data: JSON.parse(JSON.stringify(event.result)), // Deep clone
			};
			// Schedule emission after transaction commit
			scheduleAfterTransaction(() => {
				try {
					strapi.$io.emit(eventData);
				} catch (error) {
					strapi.log.debug(`socket.io: Could not emit update event for ${uid}:`, error.message);
				}
			});
		};
		subscriber.beforeUpdateMany = async (event) => {
			// Don't do any queries in before* hooks to avoid transaction conflicts
			// Just store the params for use in afterUpdateMany
			if (!isActionEnabled(strapi, uid, 'update')) return;
				if (!event.state.io) {
					event.state.io = {};
				}
			event.state.io.params = event.params;
		};
		subscriber.afterUpdateMany = async (event) => {
			if (!isActionEnabled(strapi, uid, 'update')) return;
			// Fetch the updated records using params from beforeUpdateMany
			const params = event.state.io?.params;
			if (!params || !params.where) return;
			
			// Clone params to avoid transaction context issues
			const clonedWhere = JSON.parse(JSON.stringify(params.where));
			const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
		// Schedule query after transaction commit
		scheduleAfterTransaction(async () => {
				try {
			// Use Document Service API (Strapi v5)
			const records = await strapi.documents(uid).findMany({
						filters: clonedWhere,
			});
			records.forEach((r) => {
				strapi.$io.emit({
					event: 'update',
							schema: { singularName: modelInfo.singularName, uid: modelInfo.uid },
					data: r,
				});
			});
			} catch (error) {
					strapi.log.debug(`socket.io: Could not fetch records in afterUpdateMany for ${uid}:`, error.message);
				}
		}, 50);
		};

		// DELETE - check dynamically if enabled
		subscriber.afterDelete = async (event) => {
			if (!isActionEnabled(strapi, uid, 'delete')) return;
			// Extract minimal data to avoid transaction context issues
			const deleteData = {
				id: event.result?.id || event.result?.documentId,
				documentId: event.result?.documentId || event.result?.id,
			};
			const modelInfo = {
				singularName: event.model.singularName,
				uid: event.model.uid,
			};
			
			// Use raw emit to avoid sanitization queries within transaction
			scheduleAfterTransaction(() => {
				try {
					const eventName = `${modelInfo.singularName}:delete`;
					strapi.$io.raw({
						event: eventName,
						data: deleteData,
					});
				} catch (error) {
					strapi.log.debug(`socket.io: Could not emit delete event for ${uid}:`, error.message);
				}
			}, 100); // Delay to ensure transaction is fully closed
		};
		// Bulk delete events are intentionally disabled to prevent transaction conflicts

		// setup lifecycles
		strapi.db.lifecycles.subscribe(subscriber);
	});

	// Log configured content types
	const configuredCount = enabledUids.length;
	if (configuredCount > 0) {
		strapi.log.info(`socket.io: Lifecycle hooks registered for ${configuredCount} content type(s)`);
	}
}

function buildEventQuery({ event }) {
	const query = {};

	if (event.params.where) {
		query.filters = event.params.where;
	}

	if (event.result?.count) {
		query.limit = event.result.count;
	} else if (event.params.limit) {
		query.limit = event.params.limit;
	}

	if (event.action === 'afterCreateMany') {
		query.filters = { id: event.result.ids };
	} else if (event.action === 'beforeUpdate') {
		query.fields = ['id'];
	}

	return query;
}

module.exports = { bootstrapLifecycles };
