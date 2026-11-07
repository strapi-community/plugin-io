/** API token types as defined by Strapi core (`admin::api-token`.type). */
const API_TOKEN_TYPE = Object.freeze({
	READ_ONLY: 'read-only',
	FULL_ACCESS: 'full-access',
	CUSTOM: 'custom',
});

/** Content events the plugin can emit, in the order the admin UI lists them. */
const CONTENT_ACTIONS = Object.freeze(['create', 'update', 'delete', 'publish', 'unpublish', 'discardDraft']);

/** Socket.IO and Node event names that can never be used for broadcasts. */
const RESERVED_EVENT_NAMES = Object.freeze([
	'connect',
	'connect_error',
	'connection',
	'disconnect',
	'disconnecting',
	'error',
	'newListener',
	'removeListener',
]);

/** Room name prefixes the plugin manages itself. */
const ROOM_PREFIX = Object.freeze({
	ROLE: 'io-role-',
	TOKEN: 'io-token-',
	ADMIN: 'io-admin-',
	ENTITY: 'io-entity-',
	PRESENCE: 'presence:',
});

/** Content type uids the plugin can emit events for (`api::<name>.<name>`). */
const CONTENT_TYPE_UID_RE = /^api::[a-z0-9-]+\.[a-z0-9-]+$/;

/** Admin RBAC actions registered by the plugin (uids are `plugin::io.<uid>`). */
const PERMISSIONS = Object.freeze({
	SETTINGS_READ: 'plugin::io.settings.read',
	SETTINGS_UPDATE: 'plugin::io.settings.update',
	MONITORING_READ: 'plugin::io.monitoring.read',
	MONITORING_MANAGE: 'plugin::io.monitoring.manage',
});

export { API_TOKEN_TYPE, CONTENT_ACTIONS, CONTENT_TYPE_UID_RE, PERMISSIONS, RESERVED_EVENT_NAMES, ROOM_PREFIX };
