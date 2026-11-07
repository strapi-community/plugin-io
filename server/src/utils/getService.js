import { pluginId } from './pluginId.js';

/**
 * Returns a service of this plugin.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi - Strapi instance.
 * @param {string} name - Service name inside the `io` plugin.
 * @returns {any} The service instance.
 */
function getService(strapi, name) {
	return strapi.plugin(pluginId).service(name);
}

export { getService };
