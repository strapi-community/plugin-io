'use strict';

const { pluginId } = require('../utils/pluginId');
const { errors } = require('@strapi/utils');
const { z } = require('zod');

const settingsSchema = z.object({
	enabled: z.boolean().optional(),
	cors: z.object({
		origins: z.array(z.string()).optional(),
		methods: z.array(z.string()).optional(),
		credentials: z.boolean().optional(),
	}).optional(),
	connection: z.object({
		maxConnections: z.number().int().positive().optional(),
		pingTimeout: z.number().int().positive().optional(),
		pingInterval: z.number().int().positive().optional(),
		connectionTimeout: z.number().int().positive().optional(),
		allowEIO3: z.boolean().optional(),
	}).optional(),
	security: z.object({
		requireAuthentication: z.boolean().optional(),
		rateLimiting: z.object({
			enabled: z.boolean().optional(),
			maxEventsPerSecond: z.number().int().positive().optional(),
		}).optional(),
		ipWhitelist: z.array(z.string()).optional(),
		ipBlacklist: z.array(z.string()).optional(),
	}).optional(),
	contentTypes: z.record(z.any()).optional(),
	events: z.object({
		customEventNames: z.boolean().optional(),
		includeRelations: z.boolean().optional(),
		excludeFields: z.array(z.string()).optional(),
		onlyPublished: z.boolean().optional(),
	}).optional(),
	rooms: z.object({
		autoJoinByRole: z.record(z.array(z.string())).optional(),
		enablePrivateRooms: z.boolean().optional(),
	}).optional(),
	entitySubscriptions: z.object({
		enabled: z.boolean().optional(),
		maxSubscriptionsPerSocket: z.number().int().positive().optional(),
		requireVerification: z.boolean().optional(),
		allowedContentTypes: z.array(z.string()).optional(),
		enableMetrics: z.boolean().optional(),
	}).optional(),
	rolePermissions: z.record(z.any()).optional(),
	redis: z.object({
		enabled: z.boolean().optional(),
		url: z.string().optional(),
	}).optional(),
	namespaces: z.object({
		enabled: z.boolean().optional(),
		list: z.record(z.any()).optional(),
	}).optional(),
	middleware: z.object({
		enabled: z.boolean().optional(),
		handlers: z.array(z.any()).optional(),
	}).optional(),
	monitoring: z.object({
		enableConnectionLogging: z.boolean().optional(),
		enableEventLogging: z.boolean().optional(),
		maxEventLogSize: z.number().int().positive().optional(),
	}).optional(),
	presence: z.object({
		enabled: z.boolean().optional(),
		heartbeatInterval: z.number().int().positive().optional(),
		staleTimeout: z.number().int().positive().optional(),
		showAvatars: z.boolean().optional(),
		showTypingIndicator: z.boolean().optional(),
	}).optional(),
	livePreview: z.object({
		enabled: z.boolean().optional(),
		draftEvents: z.boolean().optional(),
		debounceMs: z.number().int().nonnegative().optional(),
		maxSubscriptionsPerSocket: z.number().int().positive().optional(),
	}).optional(),
	fieldLevelChanges: z.object({
		enabled: z.boolean().optional(),
		includeFullData: z.boolean().optional(),
		excludeFields: z.array(z.string()).optional(),
		maxDiffDepth: z.number().int().positive().optional(),
	}).optional(),
}).strict();

/**
 * Settings controller for io plugin
 */
module.exports = ({ strapi }) => ({
	/**
	 * GET /io/settings
	 * @route GET /io/settings
	 * @returns {object} Current plugin settings
	 */
	async getSettings(ctx) {
		const settingsService = strapi.plugin(pluginId).service('settings');
		const settings = await settingsService.getSettings();
		ctx.body = { data: settings };
	},

	/**
	 * PUT /io/settings
	 * @route PUT /io/settings
	 * @returns {object} Updated plugin settings
	 * @throws {ValidationError} If body fails Zod validation
	 */
	async updateSettings(ctx) {
		const settingsService = strapi.plugin(pluginId).service('settings');
		const { body } = ctx.request;

		if (!body || typeof body !== 'object' || Array.isArray(body)) {
			throw new errors.ValidationError('Request body must be a JSON object');
		}

		const parsed = settingsSchema.safeParse(body);
		if (!parsed.success) {
			const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
			throw new errors.ValidationError(`Invalid settings: ${details}`);
		}

		const oldSettings = await settingsService.getSettings();
		const updatedSettings = await settingsService.setSettings(parsed.data);

		strapi.$ioSettings = updatedSettings;

		let reloaded = false;
		if (strapi.$io?.server) {
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
	 * @route POST /io/test-event
	 * @returns {object} Test event result
	 * @throws {ApplicationError} If Socket.IO is not initialised
	 */
	async sendTestEvent(ctx) {
		const monitoringService = strapi.plugin(pluginId).service('monitoring');
		const { eventName, data } = ctx.request.body;

		const safeName = (eventName || 'test').replace(/[^a-zA-Z0-9:._-]/g, '').substring(0, 50);
		const result = monitoringService.sendTestEvent(safeName, data || {});
		ctx.body = { data: result };
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
	 * @route GET /io/roles
	 * @returns {object} Available user roles
	 */
	async getRoles(ctx) {
		const roles = await strapi.documents('plugin::users-permissions.role').findMany({
			fields: ['id', 'name', 'type', 'description'],
			limit: 100,
		});
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
