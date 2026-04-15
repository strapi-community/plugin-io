const STORE_KEY = 'plugin_io_settings';

/**
 * Default settings for the Socket.IO plugin admin UI.
 * Stored in the Strapi core_store table.
 */
const DEFAULT_SETTINGS = {
  enabled: true,
  cors: {
    origins: ['http://localhost:3000'],
  },
  connection: {
    maxConnections: 1000,
    pingTimeout: 20000,
    pingInterval: 25000,
    connectionTimeout: 45000,
  },
  security: {
    requireAuthentication: false,
    rateLimiting: {
      enabled: false,
      maxEventsPerSecond: 10,
    },
    ipWhitelist: [],
    ipBlacklist: [],
  },
  events: {
    customEventNames: false,
    includeRelations: false,
    excludeFields: [],
    onlyPublished: false,
  },
  rooms: {
    autoJoinByRole: {},
    enablePrivateRooms: false,
  },
  redis: {
    enabled: false,
    url: 'redis://localhost:6379',
  },
  namespaces: {
    enabled: false,
    list: {},
  },
  middleware: {
    enabled: false,
    handlers: [],
  },
  monitoring: {
    enableConnectionLogging: true,
    enableEventLogging: false,
    maxEventLogSize: 100,
  },
  entitySubscriptions: {
    enabled: true,
    maxSubscriptionsPerSocket: 100,
    requireVerification: true,
    allowedContentTypes: [],
    enableMetrics: true,
  },
  presence: {
    enabled: true,
    heartbeatInterval: 30000,
    staleTimeout: 60000,
    showTypingIndicator: true,
  },
  livePreview: {
    enabled: true,
    debounceMs: 300,
    draftEvents: true,
    maxSubscriptionsPerSocket: 50,
  },
  fieldLevelChanges: {
    enabled: true,
    includeFullData: false,
    maxDiffDepth: 3,
  },
  rolePermissions: {},
};

/**
 * Settings service for the Socket.IO plugin.
 * Persists admin-configurable settings in the Strapi store.
 *
 * @param {{ strapi: import('@strapi/strapi').Strapi }} deps
 * @returns {object} Settings service API
 */
export default ({ strapi }) => {
  /** @returns {import('@strapi/strapi').Strapi['store']} */
  const getStore = () =>
    strapi.store({ type: 'plugin', name: 'io' });

  return {
    /**
     * Retrieve current settings, merged with defaults.
     * @returns {Promise<object>} The merged settings object
     */
    async getSettings() {
      const store = getStore();
      const stored = await store.get({ key: STORE_KEY });
      if (!stored) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...stored };
    },

    /**
     * Persist settings to the Strapi store.
     * @param {object} settings - The settings object to save
     * @returns {Promise<object>} The saved settings
     */
    async setSettings(settings) {
      const store = getStore();
      const merged = { ...DEFAULT_SETTINGS, ...settings };
      await store.set({ key: STORE_KEY, value: merged });
      return merged;
    },

    /**
     * List all api:: content types available for event subscriptions.
     * @returns {{ uid: string; displayName: string }[]}
     */
    getContentTypes() {
      return Object.values(strapi.contentTypes)
        .filter((ct) => ct.uid.startsWith('api::'))
        .map((ct) => ({
          uid: ct.uid,
          displayName: ct.info?.displayName || ct.info?.singularName || ct.uid,
          singularName: ct.info?.singularName,
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    },

    /**
     * List users-permissions roles.
     * @returns {Promise<Array>} Array of role objects
     */
    async getRoles() {
      try {
        const roles = await strapi
          .documents('plugin::users-permissions.role')
          .findMany({
            fields: ['id', 'name', 'type', 'description'],
            limit: 100,
          });
        return roles;
      } catch {
        return [];
      }
    },
  };
};
