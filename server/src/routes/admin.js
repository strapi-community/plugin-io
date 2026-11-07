import { PERMISSIONS } from '../utils/constants.js';

/**
 * Builds the route policies: authenticated admin plus the given actions.
 *
 * @param {string[]} actions - Required admin actions.
 * @returns {{ policies: Array<string | object> }} Route config.
 * @see https://docs.strapi.io/cms/plugins-development/guides/admin-permissions-for-plugins
 */
const can = (...actions) => ({
	policies: ['admin::isAuthenticatedAdmin', { name: 'admin::hasPermissions', config: { actions } }],
});

export default [
	{ method: 'GET', path: '/settings', handler: 'settings.getSettings', config: can(PERMISSIONS.SETTINGS_READ) },
	{
		method: 'PUT',
		path: '/settings',
		handler: 'settings.updateSettings',
		config: can(PERMISSIONS.SETTINGS_UPDATE),
	},
	{
		method: 'GET',
		path: '/content-types',
		handler: 'settings.getContentTypes',
		config: can(PERMISSIONS.SETTINGS_READ),
	},
	{ method: 'GET', path: '/roles', handler: 'settings.getRoles', config: can(PERMISSIONS.SETTINGS_READ) },
	{ method: 'GET', path: '/stats', handler: 'monitoring.getStats', config: can(PERMISSIONS.MONITORING_READ) },
	{
		method: 'GET',
		path: '/event-log',
		handler: 'monitoring.getEventLog',
		config: can(PERMISSIONS.MONITORING_READ),
	},
	{
		method: 'GET',
		path: '/online-users',
		handler: 'monitoring.getOnlineUsers',
		config: can(PERMISSIONS.MONITORING_READ),
	},
	{
		method: 'POST',
		path: '/test-event',
		handler: 'monitoring.sendTestEvent',
		config: can(PERMISSIONS.MONITORING_MANAGE),
	},
	{
		method: 'POST',
		path: '/reset-stats',
		handler: 'monitoring.resetStats',
		config: can(PERMISSIONS.MONITORING_MANAGE),
	},
	{
		method: 'POST',
		path: '/presence/session',
		handler: 'presence.createSession',
		config: { policies: ['admin::isAuthenticatedAdmin'] },
	},
];
