import { PLUGIN_ID } from './pluginId';
import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';

export default {
	register(app) {
		// Register plugin
		app.registerPlugin({
			id: PLUGIN_ID,
			initializer: Initializer,
			isReady: false,
			name: PLUGIN_ID,
		});

		// Add settings link in Strapi Settings
		app.createSettingSection(
			{
				id: PLUGIN_ID,
				intlLabel: {
					id: `${PLUGIN_ID}.plugin.name`,
					defaultMessage: 'Socket.IO',
				},
			},
			[
				{
					intlLabel: {
						id: `${PLUGIN_ID}.settings.title`,
						defaultMessage: 'Settings',
					},
					id: `${PLUGIN_ID}-settings`,
					to: `${PLUGIN_ID}/settings`,
					Component: () => import('./pages/SettingsPage').then((mod) => ({ default: mod.SettingsPage })),
				},
				{
					intlLabel: {
						id: `${PLUGIN_ID}.monitoring.title`,
						defaultMessage: 'Monitoring',
					},
					id: `${PLUGIN_ID}-monitoring`,
					to: `${PLUGIN_ID}/monitoring`,
					Component: () => import('./pages/MonitoringPage').then((mod) => ({ default: mod.MonitoringPage })),
				},
			]
		);

		// Register Socket.IO Stats Widget for Homepage (Strapi v5.13+)
		if ('widgets' in app) {
			// Stats Widget
			app.widgets.register({
				icon: PluginIcon,
				title: {
					id: `${PLUGIN_ID}.widget.socket-stats.title`,
					defaultMessage: 'Socket.IO Stats',
				},
				component: async () => {
					const component = await import('./components/SocketStatsWidget');
					return component.SocketStatsWidget;
				},
				id: 'socket-io-stats-widget',
				pluginId: PLUGIN_ID,
			});

			// Who's Online Widget
			app.widgets.register({
				icon: PluginIcon,
				title: {
					id: `${PLUGIN_ID}.widget.online-editors.title`,
					defaultMessage: "Who's Online",
				},
				component: async () => {
					const component = await import('./components/OnlineEditorsWidget');
					return component.OnlineEditorsWidget;
				},
				id: 'socket-io-online-editors-widget',
				pluginId: PLUGIN_ID,
			});

			console.log(`[${PLUGIN_ID}] [SUCCESS] Dashboard widgets registered`);
		}
	},

	async bootstrap(app) {
		console.log(`[${PLUGIN_ID}] [INFO] Bootstrapping plugin...`);

		// Inject Live Presence Panel into Content Manager sidebar
		try {
			const { default: LivePresencePanel } = await import('./components/LivePresencePanel');
			
			const contentManagerPlugin = app.getPlugin('content-manager');
			if (contentManagerPlugin && contentManagerPlugin.apis) {
				contentManagerPlugin.apis.addEditViewSidePanel([LivePresencePanel]);
				console.log(`[${PLUGIN_ID}] [SUCCESS] LivePresencePanel injected into sidebar`);
			}
		} catch (error) {
			// Content Manager injection not available - this is expected in some Strapi versions
			console.log(`[${PLUGIN_ID}] [INFO] Content Manager panel injection not available:`, error.message);
		}
	},

	async registerTrads({ locales }) {
		const importedTrads = await Promise.all(
			locales.map((locale) => {
				return import(`./translations/${locale}.json`)
					.then(({ default: data }) => {
						return {
							data: prefixPluginTranslations(data, PLUGIN_ID),
							locale,
						};
					})
					.catch(() => {
						return {
							data: {},
							locale,
						};
					});
			})
		);

		return Promise.resolve(importedTrads);
	},
};

// Helper to prefix translations with plugin ID
const prefixPluginTranslations = (trad, pluginId) => {
	return Object.keys(trad).reduce((acc, current) => {
		acc[`${pluginId}.${current}`] = trad[current];
		return acc;
	}, {});
};
