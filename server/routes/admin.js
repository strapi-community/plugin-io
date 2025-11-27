'use strict';

/**
 * Admin routes for io plugin settings
 */
module.exports = {
	type: 'admin',
	routes: [
		{
			method: 'GET',
			path: '/settings',
			handler: 'settings.getSettings',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
		{
			method: 'PUT',
			path: '/settings',
			handler: 'settings.updateSettings',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
		{
			method: 'GET',
			path: '/content-types',
			handler: 'settings.getContentTypes',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
		{
			method: 'GET',
			path: '/stats',
			handler: 'settings.getStats',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
		{
			method: 'GET',
			path: '/event-log',
			handler: 'settings.getEventLog',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
		{
			method: 'POST',
			path: '/test-event',
			handler: 'settings.sendTestEvent',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
		{
			method: 'POST',
			path: '/reset-stats',
			handler: 'settings.resetStats',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
		{
			method: 'GET',
			path: '/roles',
			handler: 'settings.getRoles',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
		{
			method: 'GET',
			path: '/monitoring/stats',
			handler: 'settings.getMonitoringStats',
			config: {
				policies: ['admin::isAuthenticatedAdmin'],
			},
		},
	],
};
