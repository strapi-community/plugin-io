'use strict';

const { pluginId } = require('../utils/pluginId');

/**
 * Settings controller for io plugin
 */
module.exports = ({ strapi }) => ({
	/**
	 * GET /io/settings
	 * Retrieve current plugin settings
	 */
	async getSettings(ctx) {
		const settingsService = strapi.plugin(pluginId).service('settings');
		const settings = await settingsService.getSettings();
		ctx.body = { data: settings };
	},

	/**
	 * PUT /io/settings
	 * Update plugin settings and hot-reload Socket.IO
	 */
	async updateSettings(ctx) {
		const settingsService = strapi.plugin(pluginId).service('settings');
		const { body } = ctx.request;

		// Get old settings to compare
		const oldSettings = await settingsService.getSettings();
		const updatedSettings = await settingsService.setSettings(body);

		// Update stored settings reference for lifecycle hooks
		strapi.$ioSettings = updatedSettings;

		// Hot-reload: Update connection logging handler
		let reloaded = false;
		if (strapi.$io?.server) {
			// Log the change
			strapi.log.info(`socket.io: Settings updated (origin: ${updatedSettings.cors?.origin}, contentTypes: ${updatedSettings.contentTypes?.length || 0})`);
			reloaded = true;
		}

		ctx.body = { data: updatedSettings, reloaded };
	},

	/**
	 * GET /io/content-types
	 * Get available content types for selection
	 */
	async getContentTypes(ctx) {
		const contentTypes = Object.keys(strapi.contentTypes)
			.filter((uid) => uid.startsWith('api::'))
			.map((uid) => {
				const ct = strapi.contentTypes[uid];
				return {
					uid,
					displayName: ct.info?.displayName || ct.info?.singularName || uid,
					singularName: ct.info?.singularName,
					pluralName: ct.info?.pluralName,
				};
			});

		ctx.body = { data: contentTypes };
	},

	/**
	 * GET /io/stats
	 * Get connection and event statistics
	 */
	async getStats(ctx) {
		const monitoringService = strapi.plugin(pluginId).service('monitoring');
		const connectionStats = monitoringService.getConnectionStats();
		const eventStats = monitoringService.getEventStats();

		ctx.body = {
			data: {
				connections: connectionStats,
				events: eventStats,
			},
		};
	},

	/**
	 * GET /io/event-log
	 * Get recent event log
	 */
	async getEventLog(ctx) {
		const monitoringService = strapi.plugin(pluginId).service('monitoring');
		const limit = parseInt(ctx.query.limit) || 50;
		const log = monitoringService.getEventLog(limit);

		ctx.body = { data: log };
	},

	/**
	 * POST /io/test-event
	 * Send a test event
	 */
	async sendTestEvent(ctx) {
		const monitoringService = strapi.plugin(pluginId).service('monitoring');
		const { eventName, data } = ctx.request.body;

		try {
			const result = monitoringService.sendTestEvent(eventName || 'test', data || {});
			ctx.body = { data: result };
		} catch (error) {
			ctx.throw(500, error.message);
		}
	},

	/**
	 * POST /io/reset-stats
	 * Reset monitoring statistics
	 */
	async resetStats(ctx) {
		const monitoringService = strapi.plugin(pluginId).service('monitoring');
		monitoringService.resetStats();
		ctx.body = { data: { success: true } };
	},

	/**
	 * GET /io/roles
	 * Get available user roles for permissions configuration
	 */
	async getRoles(ctx) {
		// Use Document Service API (Strapi v5)
		const roles = await strapi.documents('plugin::users-permissions.role').findMany({});
		ctx.body = {
			data: roles.map((role) => ({
				id: role.id,
				name: role.name,
				type: role.type,
				description: role.description,
			})),
		};
	},

	/**
	 * GET /io/monitoring/stats
	 * Get lightweight stats for dashboard widget
	 */
	async getMonitoringStats(ctx) {
		const monitoringService = strapi.plugin(pluginId).service('monitoring');
		const connectionStats = monitoringService.getConnectionStats();
		const eventStats = monitoringService.getEventStats();

		// Return lightweight stats optimized for widget
		ctx.body = {
			data: {
				connections: {
					connected: connectionStats.connected,
					rooms: connectionStats.rooms || [],
				},
				events: {
					totalEvents: eventStats.totalEvents || 0,
					eventsPerSecond: eventStats.eventsPerSecond || 0,
					eventsByType: eventStats.eventsByType || {},
				},
				timestamp: Date.now(),
			},
		};
	},
});
