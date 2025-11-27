'use strict';

const { pluginId } = require('../utils/pluginId');

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
			strapi.$io.emit({
				event: 'create',
				schema: event.model,
				data: event.result,
			});
		};
		subscriber.afterCreateMany = async (event) => {
			if (!isActionEnabled(strapi, uid, 'create')) return;
			const query = buildEventQuery({ event });
			if (query.filters) {
				const records = await strapi.entityService.findMany(uid, query);
				records.forEach((r) => {
					strapi.$io.emit({
						event: 'create',
						schema: event.model,
						data: r,
					});
				});
			}
		};

		// UPDATE - check dynamically if enabled
		subscriber.afterUpdate = async (event) => {
			if (!isActionEnabled(strapi, uid, 'update')) return;
			strapi.$io.emit({
				event: 'update',
				schema: event.model,
				data: event.result,
			});
		};
		subscriber.beforeUpdateMany = async (event) => {
			if (!isActionEnabled(strapi, uid, 'update')) return;
			const query = buildEventQuery({ event });
			if (query.filters) {
				const ids = await strapi.entityService.findMany(uid, query);
				if (!event.state.io) {
					event.state.io = {};
				}
				event.state.io.ids = ids;
			}
		};
		subscriber.afterUpdateMany = async (event) => {
			if (!isActionEnabled(strapi, uid, 'update')) return;
			if (!event.state.io?.ids) return;
			const records = await strapi.entityService.findMany(uid, {
				filters: { id: event.state.io.ids },
			});
			records.forEach((r) => {
				strapi.$io.emit({
					event: 'update',
					schema: event.model,
					data: r,
				});
			});
		};

		// DELETE - check dynamically if enabled
		subscriber.afterDelete = async (event) => {
			if (!isActionEnabled(strapi, uid, 'delete')) return;
			strapi.$io.emit({
				event: 'delete',
				schema: event.model,
				data: event.result,
			});
		};
		subscriber.beforeDeleteMany = async (event) => {
			if (!isActionEnabled(strapi, uid, 'delete')) return;
			const query = buildEventQuery({ event });
			if (query.filters) {
				const records = await strapi.entityService.findMany(uid, query);
				if (!event.state.io) {
					event.state.io = {};
				}
				event.state.io.records = records;
			}
		};
		subscriber.afterDeleteMany = async (event) => {
			if (!isActionEnabled(strapi, uid, 'delete')) return;
			if (!event.state.io?.records) return;
			event.state.io.records.forEach((r) => {
				strapi.$io.emit({
					event: 'delete',
					schema: event.model,
					data: r,
				});
			});
		};

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
