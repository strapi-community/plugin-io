/**
 * Admin RBAC actions of the plugin. Strapi grants new actions to the Super
 * Admin role only; other roles get them in Settings > Roles > Plugins > IO.
 *
 * @see https://docs.strapi.io/cms/plugins-development/guides/admin-permissions-for-plugins
 */
const ACTIONS = [
	{ section: 'plugins', displayName: 'Read settings', uid: 'settings.read', subCategory: 'Settings', pluginName: 'io' },
	{
		section: 'plugins',
		displayName: 'Update settings',
		uid: 'settings.update',
		subCategory: 'Settings',
		pluginName: 'io',
	},
	{
		section: 'plugins',
		displayName: 'Read monitoring',
		uid: 'monitoring.read',
		subCategory: 'Monitoring',
		pluginName: 'io',
	},
	{
		section: 'plugins',
		displayName: 'Reset statistics and send test events',
		uid: 'monitoring.manage',
		subCategory: 'Monitoring',
		pluginName: 'io',
	},
];

/**
 * Registers the plugin's admin permission actions.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {Promise<void>}
 */
async function registerPermissions({ strapi }) {
	await strapi.admin.services.permission.actionProvider.registerMany(ACTIONS);
}

export { ACTIONS, registerPermissions };
