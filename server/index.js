'use strict';

const bootstrap = require('./bootstrap');
const config = require('./config');
const controllers = require('./controllers');
const routes = require('./routes');
const services = require('./services');
const { pluginId } = require('./utils/pluginId');

const register = async () => {};
const contentTypes = {};
const middlewares = {};
const policies = {};

/**
 * Gracefully shuts down the Socket.IO server, clears all background
 * intervals, disconnects Redis adapter clients, and releases every
 * handle that would otherwise keep the Node process alive
 * (e.g. after `strapi ts:generate-types`).
 */
const destroy = async ({ strapi }) => {
	try {
		// 1. Stop presence service cleanup interval
		const presenceService = strapi.plugin(pluginId)?.service('presence');
		if (presenceService?.stopCleanupInterval) {
			presenceService.stopCleanupInterval();
		}

		// 2. Stop session-token cleanup interval (presence controller)
		const presenceController = strapi.plugin(pluginId)?.controller('presence');
		if (presenceController?.stopTokenCleanup) {
			presenceController.stopTokenCleanup();
		}

		// 3. Stop security service cleanup interval
		const securityService = strapi.plugin(pluginId)?.service('security');
		if (securityService?.stopCleanupInterval) {
			securityService.stopCleanupInterval();
		}

		// 4. Disconnect all connected sockets and close Socket.IO server
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

		// 5. Disconnect Redis adapter clients if present
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

module.exports = {
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
