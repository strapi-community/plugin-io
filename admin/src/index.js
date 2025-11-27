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
			console.log(`[${PLUGIN_ID}] ✅ Socket.IO Stats Widget registered`);
		}
	},

	bootstrap(app) {
		console.log(`[${PLUGIN_ID}] Bootstrapping plugin...`);
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
