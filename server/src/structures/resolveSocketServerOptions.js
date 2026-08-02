/**
 * Default Socket.IO / Engine.IO options that keep Strapi's own WebSocket
 * endpoints (notably Data Transfer at `/admin/transfer/*`) usable on the
 * same HTTP server.
 *
 * Engine.IO defaults to `destroyUpgrade: true`, which ends any non-matching
 * upgrade after ~1s if no bytes were written. Behind reverse proxies
 * (e.g. DigitalOcean App Platform) Strapi transfer handshakes often exceed
 * that window and surface as HTTP 504. See GitHub issue #112.
 *
 * @typedef {import('socket.io').ServerOptions & { destroyUpgrade?: boolean, destroyUpgradeTimeout?: number }} SocketServerOptions
 */

/** @type {Readonly<Partial<SocketServerOptions>>} */
const SAFE_DEFAULTS = Object.freeze({
	/**
	 * Do not tear down upgrades destined for other handlers on this server
	 * (Strapi transfer, custom WS, etc.).
	 */
	destroyUpgrade: false,
});

/**
 * Merges user-provided Socket.IO server options with plugin-safe defaults.
 * Explicit user values always win.
 *
 * @param {SocketServerOptions | null | undefined} userOptions - Options from plugin config `socket.serverOptions`.
 * @returns {SocketServerOptions} Options safe to pass to `new Server(httpServer, options)`.
 * @example
 * resolveSocketServerOptions({ cors: { origin: '*' } })
 * // => { destroyUpgrade: false, cors: { origin: '*' } }
 */
function resolveSocketServerOptions(userOptions) {
	const options = userOptions && typeof userOptions === 'object' ? userOptions : {};

	return {
		...SAFE_DEFAULTS,
		...options,
	};
}

export { resolveSocketServerOptions, SAFE_DEFAULTS };
