'use strict';

const { sanitize } = require('@strapi/utils');

module.exports = ({ strapi }) => {
	/**
	 * Sanitize data output with a provided schema for a specified role
	 *
	 * @param {Object} param
	 * @param {Object} param.schema
	 * @param {Object} param.data
	 * @param {Object} param.auth
	 */
	function output({ schema, data, options }) {
		// Check if sanitize.contentAPI is available (might not be in setTimeout context)
		if (!sanitize || !sanitize.contentAPI || !sanitize.contentAPI.output) {
			// Fallback: return data as-is if sanitize is not available
			strapi.log.debug('socket.io: sanitize.contentAPI not available, returning raw data');
			return data;
		}
		return sanitize.contentAPI.output(data, schema, options);
	}

	return {
		output,
	};
};
