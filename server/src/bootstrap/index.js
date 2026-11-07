import { pluginId } from '../utils/pluginId.js';
import { createDocumentEventsMiddleware } from './document-events.js';
import { registerInvalidation } from './invalidation.js';
import { bootstrapIO } from './io.js';
import { registerPermissions } from './permissions.js';

/**
 * Plugin bootstrap: registers admin permissions, loads the settings, starts
 * Socket.IO and the content event middleware.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {Promise<void>}
 */
async function bootstrap({ strapi }) {
	await registerPermissions({ strapi });
	await strapi.plugin(pluginId).service('settings').load();
	strapi.plugin(pluginId).service('presence').start();
	await bootstrapIO({ strapi });
	strapi.documents.use(createDocumentEventsMiddleware(strapi));
	registerInvalidation({ strapi });
}

export default bootstrap;
