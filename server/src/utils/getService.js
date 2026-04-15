import { pluginId } from './pluginId.js';

/**
 * @param {object} options
 * @param {string} [options.name]
 * @param {string} [options.plugin]
 * @param {string} [options.type]
 * @returns {object} Strapi service instance
 */
function getService({ name, plugin = pluginId, type = 'plugin' }) {
	let serviceUID = `${type}::${plugin}`;

	if (name && name.length) {
		serviceUID += `.${name}`;
	}

	return strapi.service(serviceUID);
}

export { getService };
