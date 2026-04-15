import bootstrap from './bootstrap/index.js';
import config from './config/index.js';
import controllers from './controllers/index.js';
import routes from './routes/index.js';
import services from './services/index.js';
import { pluginId } from './utils/pluginId.js';

const register = async () => {};
const contentTypes = {};
const middlewares = {};
const policies = {};

/**
 * Gracefully shuts down the Socket.IO server, clears all background
 * intervals, disconnects Redis adapter clients, and releases every
 * handle that would otherwise keep the Node process alive.
 */
const destroy = async ({ strapi }) => {
	try {
		const presenceService = strapi.plugin(pluginId)?.service('presence');
		if (presenceService?.stopCleanupInterval) {
			presenceService.stopCleanupInterval();
		}

		const presenceController = strapi.plugin(pluginId)?.controller('presence');
		if (presenceController?.stopTokenCleanup) {
			presenceController.stopTokenCleanup();
		}

		const securityService = strapi.plugin(pluginId)?.service('security');
		if (securityService?.stopCleanupInterval) {
			securityService.stopCleanupInterval();
		}

		const io = strapi.$io?.server;
		if (io) {
			io.disconnectSockets(true);
			await new Promise((resolve) => {
				io.close((err) => {
					if (err) {
						strapi.log.warn(`socket.io: Error closing server: ${err.message}`);
					}
					resolve();
				});
			});
		}

		const redisClients = strapi.$io?._redisClients;
		if (redisClients) {
			await Promise.allSettled([
				redisClients.pubClient?.quit?.(),
				redisClients.subClient?.quit?.(),
			]);
		}

		strapi.log.info('socket.io: Plugin destroyed - all handles released');
	} catch (err) {
		strapi.log.error(`socket.io: Error during destroy: ${err.message}`);
	}
};

export default {
	register,
	bootstrap,
	destroy,
	config,
	controllers,
	routes,
	services,
	contentTypes,
	policies,
	middlewares,
};
