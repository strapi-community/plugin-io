'use strict';

const { bootstrapIO } = require('./io');
const { bootstrapLifecycles } = require('./lifecycle');

/**
 * Runs on bootstrap phase
 *
 * @param {*} params
 * @param {*} params.strapi
 */
async function bootstrap({ strapi }) {
	bootstrapIO({ strapi });
	bootstrapLifecycles({ strapi });
}

module.exports = bootstrap;
