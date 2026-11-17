import { createRequire } from 'node:module';
import { join } from 'node:path';
import { errors as pluginErrors } from '@strapi/utils';

/** @type {Map<string, typeof pluginErrors>} Resolved error classes per app root. */
const cache = new Map();

/**
 * Loads the `errors` export of the `@strapi/utils` copy that the host's
 * `@strapi/core` uses, by resolving `@strapi/strapi` from the app root, then
 * `@strapi/core` from `@strapi/strapi` and `@strapi/utils` from `@strapi/core`.
 *
 * Strapi's error middleware turns an error into a 4xx response only when it
 * is an `instanceof` its own `errors.ApplicationError`. npm satisfies the
 * plugin's `@strapi/utils` peer with the newest 5.x at the app root; on an
 * older host Strapi's packages pin their exact version in nested copies, so
 * the plugin's own import would be a different class and Strapi would answer
 * 500. Every step follows declared dependencies, so this works with npm,
 * Yarn and pnpm. When a step cannot be resolved (custom setups, tests) it
 * returns the plugin's own import, which is the same copy in a deduped tree.
 *
 * @param {string} appRoot - Absolute path of the Strapi app.
 * @returns {typeof pluginErrors} Error classes (`ValidationError`, `ApplicationError`, ...).
 */
export function resolveHostErrors(appRoot) {
	if (cache.has(appRoot)) return cache.get(appRoot);
	let errors = pluginErrors;
	try {
		const strapiEntry = createRequire(join(appRoot, 'package.json')).resolve('@strapi/strapi');
		const coreEntry = createRequire(strapiEntry).resolve('@strapi/core');
		const hostErrors = createRequire(coreEntry)('@strapi/utils')?.errors;
		if (typeof hostErrors?.ValidationError === 'function') errors = hostErrors;
	} catch {
		// Not resolvable from the app root: keep the plugin's own import.
	}
	cache.set(appRoot, errors);
	return errors;
}

/**
 * Error classes for errors that reach Strapi's HTTP error middleware.
 *
 * @param {{ dirs?: { app?: { root?: string } } }} strapi - Strapi instance.
 * @returns {typeof pluginErrors} Error classes of the host's `@strapi/core`.
 */
export function getHostErrors(strapi) {
	return resolveHostErrors(strapi?.dirs?.app?.root || process.cwd());
}
