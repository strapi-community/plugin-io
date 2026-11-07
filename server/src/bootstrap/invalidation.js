import { pluginId } from '../utils/pluginId.js';

const EVENTS = ['afterCreate', 'afterCreateMany', 'afterUpdate', 'afterUpdateMany', 'afterDelete', 'afterDeleteMany'];

/**
 * Debounces a function.
 *
 * @param {() => void} fn - Function.
 * @param {number} ms - Delay.
 * @returns {() => void} Debounced function.
 */
function debounce(fn, ms) {
	let timer = null;
	return () => {
		clearTimeout(timer);
		timer = setTimeout(fn, ms);
		timer.unref?.();
	};
}

/**
 * Keeps delivery and connections in sync with Strapi: clears the audience
 * cache when roles, permissions or API tokens change, and re-validates
 * connected sockets when users, admins or tokens change.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 */
function registerInvalidation({ strapi }) {
	const rooms = () => strapi.plugin(pluginId).service('rooms');
	const revalidate = (kinds) => debounce(() => strapi.$io?.revalidateSockets(kinds).catch(() => {}), 250);
	const revalidateUsers = revalidate(['user']);
	const revalidateTokens = revalidate(['token']);
	const revalidateAdmins = revalidate(['admin']);

	const subscribe = (models, handler) => {
		const subscriber = { models };
		for (const event of EVENTS) subscriber[event] = handler;
		strapi.db.lifecycles.subscribe(subscriber);
	};

	subscribe(['plugin::users-permissions.role', 'plugin::users-permissions.permission'], () => {
		rooms().invalidate();
		revalidateUsers();
	});
	subscribe(['admin::api-token', 'admin::api-token-permission'], () => {
		rooms().invalidate();
		revalidateTokens();
	});
	subscribe(['plugin::users-permissions.user'], () => revalidateUsers());
	subscribe(['admin::user'], () => revalidateAdmins());
}

export { registerInvalidation };
