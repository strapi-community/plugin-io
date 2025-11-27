'use strict';

const { pluginId } = require('./pluginId');

function getService({ name, plugin = pluginId, type = 'plugin' }) {
	let serviceUID = `${type}::${plugin}`;

	if (name && name.length) {
		serviceUID += `.${name}`;
	}

	return strapi.service(serviceUID);
}

module.exports = {
	getService,
};
