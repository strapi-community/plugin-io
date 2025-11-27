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
		return sanitize.contentAPI.output(data, schema, options);
	}

	return {
		output,
	};
};
