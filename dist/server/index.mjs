const bootstrap = require("./bootstrap");
const config = require("./config");
const controllers = require("./controllers");
const routes = require("./routes");
const services = require("./services");
const { pluginId } = require("./utils/pluginId");
const register = async () => {
};
const contentTypes = {};
const middlewares = {};
const policies = {};
const destroy = async ({ strapi }) => {
  try {
    const presenceService = strapi.plugin(pluginId)?.service("presence");
    if (presenceService?.stopCleanupInterval) {
      presenceService.stopCleanupInterval();
    }
    const presenceController = strapi.plugin(pluginId)?.controller("presence");
    if (presenceController?.stopTokenCleanup) {
      presenceController.stopTokenCleanup();
    }
    const securityService = strapi.plugin(pluginId)?.service("security");
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
        redisClients.subClient?.quit?.()
      ]);
    }
    strapi.log.info("socket.io: Plugin destroyed - all handles released");
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
  middlewares
};
