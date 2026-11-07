import { pluginId } from '../utils/pluginId.js';
import { createDocumentEventsMiddleware } from './document-events.js';
import { registerClusterSignals, registerInvalidation } from './invalidation.js';
import { bootstrapIO } from './io.js';
import { registerPermissions } from './permissions.js';

/**
 * Plugin bootstrap: registers admin permissions, loads the settings, starts
 * Socket.IO (with the configured adapter), multi-instance coordination and
 * the content event middleware.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {Promise<void>}
 */
async function bootstrap({ strapi }) {
	await registerPermissions({ strapi });
	await strapi.plugin(pluginId).service('settings').load();
	const io = await bootstrapIO({ strapi });
	// After hooks.init, so an adapter attached there is detected too.
	await strapi.plugin(pluginId).service('cluster').start({ io: io.server, adapterType: io.adapterType });
	registerClusterSignals({ strapi });
	strapi.plugin(pluginId).service('presence').start();
	strapi.documents.use(createDocumentEventsMiddleware(strapi));
	registerInvalidation({ strapi });
}

export default bootstrap;
