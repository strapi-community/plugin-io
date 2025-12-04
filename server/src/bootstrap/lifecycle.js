'use strict';

// Lazy-load transaction context to avoid bundling issues
let transactionCtx = null;
function getTransactionCtx() {
	if (!transactionCtx) {
		try {
			transactionCtx = require('@strapi/database/dist/transaction-context').transactionCtx;
		} catch (error) {
			console.warn('[strapi-plugin-io] Unable to access transaction context:', error.message);
			transactionCtx = { get: () => null, onCommit: () => {} }; // Fallback noop
		}
	}
	return transactionCtx;
}

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
 * Bootstrap lifecycles
 *
 * @param {*} params
 * @param {*} params.strapi
 */
async function bootstrapLifecycles({ strapi }) {
	strapi.config.get('plugin.io.contentTypes', []).forEach((ct) => {
		const uid = ct.uid ? ct.uid : ct;

		const subscriber = {
			models: [uid],
		};

		if (!ct.actions || ct.actions.includes('create')) {
			const eventType = 'create';
			subscriber.afterCreate = async (event) => {
				// Skip if no result data
				if (!event.result) {
					strapi.log.debug(`socket.io: No result data in afterCreate for ${uid}`);
					return;
				}
				// Clone data to avoid transaction context issues
				try {
					const eventData = {
						event: eventType,
						schema: event.model,
						data: JSON.parse(JSON.stringify(event.result)), // Deep clone
					};
					// Ensure emission runs after transaction commit
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
				const query = buildEventQuery({ event });
				if (query.filters) {
					// Clone query to avoid transaction context issues
					const clonedQuery = JSON.parse(JSON.stringify(query));
					const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
					// Ensure query executes after commit
					scheduleAfterTransaction(async () => {
						try {
							// Use Document Service API (Strapi v5)
							const records = await strapi.documents(uid).findMany(clonedQuery);
					records.forEach((r) => {
						strapi.$io.emit({
							event: eventType,
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
		}

		if (!ct.actions || ct.actions.includes('update')) {
			const eventType = 'update';
			subscriber.afterUpdate = async (event) => {
				// Clone data to avoid transaction context issues
				const eventData = {
					event: eventType,
					schema: event.model,
					data: JSON.parse(JSON.stringify(event.result)), // Deep clone
				};
				// Ensure emission runs after commit
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
					if (!event.state.io) {
						event.state.io = {};
					}
				event.state.io.params = event.params;
			};
			subscriber.afterUpdateMany = async (event) => {
				const params = event.state.io?.params;
				if (!params || !params.where) return;
				
				// Clone params to avoid transaction context issues
				const clonedWhere = JSON.parse(JSON.stringify(params.where));
				const modelInfo = { singularName: event.model.singularName, uid: event.model.uid };
				// Ensure query executes after commit
				scheduleAfterTransaction(async () => {
					try {
						// Use Document Service API (Strapi v5)
						const records = await strapi.documents(uid).findMany({
							filters: clonedWhere,
						});
						records.forEach((r) => {
							strapi.$io.emit({
								event: eventType,
								schema: { singularName: modelInfo.singularName, uid: modelInfo.uid },
								data: r,
							});
						});
					} catch (error) {
						strapi.log.debug(`socket.io: Could not fetch records in afterUpdateMany for ${uid}:`, error.message);
					}
				}, 50);
			};
		}

		if (!ct.actions || ct.actions.includes('delete')) {
			const eventType = 'delete';
			subscriber.afterDelete = async (event) => {
				// Skip if no result data
				if (!event.result) {
					strapi.log.debug(`socket.io: No result data in afterDelete for ${uid}`);
					return;
				}
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
						const eventName = `${modelInfo.singularName}:${eventType}`;
						strapi.$io.raw({
							event: eventName,
							data: deleteData,
						});
					} catch (error) {
						strapi.log.error(`socket.io: Could not emit delete event for ${uid}:`, error.message);
					}
				}, 100); // Delay to ensure transaction is fully closed
			};
			// Bulk delete events intentionally disabled to avoid transaction issues
		}

		// setup lifecycles
		strapi.db.lifecycles.subscribe(subscriber);
	});
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
