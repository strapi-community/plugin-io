'use strict';

/**
 * Default Socket.IO / Engine.IO options that keep Strapi's own WebSocket
 * endpoints (notably Data Transfer at `/admin/transfer/*`) usable on the
 * same HTTP server.
 *
 * Engine.IO defaults to `destroyUpgrade: true`, which ends any non-matching
 * upgrade after ~1s if no bytes were written. Behind reverse proxies
 * (e.g. DigitalOcean App Platform) Strapi transfer handshakes often exceed
 * that window and surface as HTTP 504. See GitHub issue #112.
 */

/** @type {Readonly<{ destroyUpgrade: boolean }>} */
const SAFE_DEFAULTS = Object.freeze({
	destroyUpgrade: false,
});

/**
 * Merges user-provided Socket.IO server options with plugin-safe defaults.
 * Explicit user values always win.
 *
 * @param {object | null | undefined} userOptions - Options from plugin config `socket.serverOptions`.
 * @returns {object} Options safe to pass to `new Server(httpServer, options)`.
 */
function resolveSocketServerOptions(userOptions) {
	const options = userOptions && typeof userOptions === 'object' ? userOptions : {};

	return {
		...SAFE_DEFAULTS,
		...options,
	};
}

module.exports = {
	resolveSocketServerOptions,
	SAFE_DEFAULTS,
};
