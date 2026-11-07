import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { PERMISSIONS } from './permissions';
import { PLUGIN_ID } from './pluginId';

/**
 * Prefixes every key of a translation file with the plugin id.
 *
 * @param {Record<string, string>} trad - Translations.
 * @returns {Record<string, string>} Prefixed translations.
 */
const prefixPluginTranslations = (trad) =>
	Object.fromEntries(Object.entries(trad).map(([key, value]) => [`${PLUGIN_ID}.${key}`, value]));

export default {
	register(app) {
		app.registerPlugin({
			id: PLUGIN_ID,
			initializer: Initializer,
			isReady: false,
			name: PLUGIN_ID,
		});

		app.addSettingsLink({ id: PLUGIN_ID, intlLabel: { id: `${PLUGIN_ID}.plugin.name`, defaultMessage: 'Socket.IO' } }, [
			{
				id: `${PLUGIN_ID}-settings`,
				to: `${PLUGIN_ID}/settings`,
				intlLabel: { id: `${PLUGIN_ID}.nav.settings`, defaultMessage: 'Settings' },
				Component: () => import('./pages/Settings'),
				permissions: PERMISSIONS.settings.read,
			},
			{
				id: `${PLUGIN_ID}-monitoring`,
				to: `${PLUGIN_ID}/monitoring`,
				intlLabel: { id: `${PLUGIN_ID}.nav.monitoring`, defaultMessage: 'Monitoring' },
				Component: () => import('./pages/Monitoring'),
				permissions: PERMISSIONS.monitoring.read,
			},
		]);

		if ('widgets' in app && typeof app.widgets?.register === 'function') {
			app.widgets.register([
				{
					id: 'socket-io-stats-widget',
					pluginId: PLUGIN_ID,
					icon: PluginIcon,
					title: { id: `${PLUGIN_ID}.widget.stats.title`, defaultMessage: 'Socket.IO' },
					link: {
						label: { id: `${PLUGIN_ID}.widget.stats.link`, defaultMessage: 'Open monitoring' },
						href: `/settings/${PLUGIN_ID}/monitoring`,
					},
					permissions: PERMISSIONS.monitoring.read,
					component: async () => (await import('./components/widgets/StatsWidget')).default,
				},
				{
					id: 'socket-io-online-editors-widget',
					pluginId: PLUGIN_ID,
					icon: PluginIcon,
					title: { id: `${PLUGIN_ID}.widget.online.title`, defaultMessage: 'Admins online' },
					link: {
						label: { id: `${PLUGIN_ID}.widget.online.link`, defaultMessage: 'Open monitoring' },
						href: `/settings/${PLUGIN_ID}/monitoring`,
					},
					permissions: PERMISSIONS.monitoring.read,
					component: async () => (await import('./components/widgets/OnlineEditorsWidget')).default,
				},
			]);
		}
	},

	async bootstrap(app) {
		const contentManager = app.getPlugin('content-manager');
		if (typeof contentManager?.apis?.addEditViewSidePanel === 'function') {
			const { LivePresencePanel } = await import('./components/LivePresencePanel');
			contentManager.apis.addEditViewSidePanel([LivePresencePanel]);
		}
	},

	async registerTrads({ locales }) {
		return Promise.all(
			locales.map(async (locale) => {
				try {
					const { default: data } = await import(`./translations/${locale}.json`);
					return { data: prefixPluginTranslations(data), locale };
				} catch {
					return { data: {}, locale };
				}
			})
		);
	},
};
