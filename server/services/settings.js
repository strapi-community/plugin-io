'use strict';

const { pluginId } = require('../utils/pluginId');

/**
 * Settings service for io plugin
 * Stores and retrieves plugin settings from Strapi's plugin store
 */
module.exports = ({ strapi }) => {
	const getPluginStore = () => {
		return strapi.store({
			type: 'plugin',
			name: pluginId,
		});
	};

	const getDefaultSettings = () => ({
		enabled: true,
		
		// CORS Settings (only origins, methods/credentials are per-role)
		cors: {
			origins: ['http://localhost:3000'], // Multiple origins
		},
		
		// Connection Settings
		connection: {
			maxConnections: 1000,
			pingTimeout: 20000, // ms
			pingInterval: 25000, // ms
			connectionTimeout: 45000, // ms
		},
		
		// Security Settings
		security: {
			requireAuthentication: false,
			rateLimiting: {
				enabled: false,
				maxEventsPerSecond: 10,
			},
			ipWhitelist: [],
			ipBlacklist: [],
		},
		
		// Content Types with granular permissions
		contentTypes: {}, // Object: { 'api::session.session': { create: true, update: true, delete: false, config: {...} } }
		
		// Event Configuration (global defaults)
		events: {
			customEventNames: false, // Use custom names like 'session:created' instead of 'session:create'
			includeRelations: false, // Populate relations
			excludeFields: [], // Fields to exclude globally
			onlyPublished: false, // Only send events for published content (Draft & Publish)
		},
		
		// Rooms & Channels
		rooms: {
			autoJoinByRole: {}, // { 'authenticated': ['users'], 'admin': ['admins'] }
			enablePrivateRooms: false,
		},
		
		// Entity Subscriptions (NEW)
		entitySubscriptions: {
			enabled: true, // Enable/disable entity-specific subscriptions
			maxSubscriptionsPerSocket: 100, // Max entities a socket can subscribe to
			requireVerification: true, // Verify entity exists before subscribing
			allowedContentTypes: [], // Empty = all allowed, or specific UIDs: ['api::article.article']
			enableMetrics: true, // Track subscription metrics
		},
		
		// Role-based Permissions
		rolePermissions: {
			// Default: all roles can connect with all methods
			authenticated: {
				canConnect: true,
				allowCredentials: true,
				allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
				contentTypes: {},
			},
			public: {
				canConnect: true,
				allowCredentials: false,
				allowedMethods: ['GET'],
				contentTypes: {},
			},
		},
		
		// Redis Adapter (for multi-server scaling)
		redis: {
			enabled: false,
			url: 'redis://localhost:6379',
		},
		
		// Namespaces
		namespaces: {
			enabled: false,
			list: {
				// Example: 'admin': { requireAuth: true },
				// Example: 'chat': { requireAuth: false },
			},
		},
		
		// Custom Middleware
		middleware: {
			enabled: false,
			handlers: [], // Array of middleware functions
		},
		
		// Monitoring & Logging
		monitoring: {
			enableConnectionLogging: true,
			enableEventLogging: false,
			maxEventLogSize: 100,
		},
	});

	return {
		/**
		 * Get current settings (merged with defaults)
		 */
		async getSettings() {
			const pluginStore = getPluginStore();
			const storedSettings = await pluginStore.get({ key: 'settings' });
			const defaults = getDefaultSettings();

			if (!storedSettings) {
				return defaults;
			}

			return {
				...defaults,
				...storedSettings,
			};
		},

		/**
		 * Update settings
		 */
		async setSettings(newSettings) {
			const pluginStore = getPluginStore();
			const currentSettings = await this.getSettings();

			const updatedSettings = {
				...currentSettings,
				...newSettings,
			};

			await pluginStore.set({
				key: 'settings',
				value: updatedSettings,
			});

			return updatedSettings;
		},

		/**
		 * Get default settings
		 */
		getDefaultSettings,
	};
};
