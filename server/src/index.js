import bootstrap from './bootstrap/index.js';
import config from './config/index.js';
import controllers from './controllers/index.js';
import routes from './routes/index.js';
import services from './services/index.js';
import { pluginId } from './utils/pluginId.js';

/**
 * Releases every handle the plugin created: Socket.IO clients and timers,
 * the upgrade forwarder, the presence token sweep, the cluster heartbeat
 * and poll, and the adapter's own connections (pg pool or Redis clients). Strapi's HTTP server is
 * left for Strapi to close, so shutdown and `strapi ts:generate-types` exit
 * cleanly (#109).
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {Promise<void>}
 */
const destroy = async ({ strapi }) => {
	try {
		strapi.plugin(pluginId)?.service('presence')?.stop();
		await strapi.plugin(pluginId)?.service('cluster')?.stop();
		await strapi.$io?.destroy();
	} catch (error) {
		strapi.log.error(`[io] Error during destroy: ${error?.message}`);
	}
};

export default {
	register() {},
	bootstrap,
	destroy,
	config,
	controllers,
	routes,
	services,
};
