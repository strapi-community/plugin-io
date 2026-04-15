import { bootstrapIO } from './io.js';
import { bootstrapLifecycles } from './lifecycle.js';

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

export default bootstrap;
