/**
 * Defaults that keep other upgrade handlers on Strapi's HTTP server working.
 * Engine.IO's `destroyUpgrade: true` ends foreign upgrades after one second;
 * the plugin forwards them to Strapi instead (#112).
 *
 * @typedef {import('socket.io').ServerOptions & { destroyUpgrade?: boolean, destroyUpgradeTimeout?: number }} SocketServerOptions
 */

/** @type {Readonly<Partial<SocketServerOptions>>} */
const SAFE_DEFAULTS = Object.freeze({
	destroyUpgrade: false,
	maxHttpBufferSize: 1e5,
});

/**
 * Checks an Origin against the allowed origins from the admin settings.
 * Requests without an Origin header (server-to-server clients) and
 * same-origin requests (the Strapi admin itself) are always allowed.
 *
 * @param {string | undefined} origin - Request Origin header.
 * @param {string[]} allowed - Allowed origins; empty means no restriction.
 * @param {string} [host] - Request Host header.
 * @returns {boolean} True when allowed.
 */
function isOriginAllowed(origin, allowed, host) {
	if (!origin || !allowed?.length) return true;
	if (allowed.includes(origin)) return true;
	try {
		return Boolean(host) && new URL(origin).host === host;
	} catch {
		return false;
	}
}

/**
 * Merges `config.socket.serverOptions` with the plugin defaults. `cors` and
 * `allowRequest` follow the admin setting "Allowed origins" unless set in the
 * config, which always wins.
 *
 * @param {SocketServerOptions | null | undefined} userOptions - Options from the plugin config.
 * @param {() => { cors: { origins: string[] } }} [getSettings] - Current admin settings.
 * @returns {SocketServerOptions} Options for `new Server(httpServer, options)`.
 * @see https://socket.io/docs/v4/server-options/
 */
function resolveSocketServerOptions(userOptions, getSettings) {
	const options = userOptions && typeof userOptions === 'object' ? { ...userOptions } : {};
	const resolved = { ...SAFE_DEFAULTS, ...options };

	if (getSettings && options.cors === undefined) {
		resolved.cors = {
			origin(origin, callback) {
				const allowed = getSettings().cors.origins;
				// An empty list keeps the previous behaviour: no cross-origin polling.
				callback(null, Boolean(origin) && allowed.length > 0 && allowed.includes(origin));
			},
			methods: ['GET', 'POST'],
		};
	}
	if (getSettings && options.allowRequest === undefined) {
		resolved.allowRequest = (req, callback) => {
			callback(null, isOriginAllowed(req.headers.origin, getSettings().cors.origins, req.headers.host));
		};
	}
	return resolved;
}

export { isOriginAllowed, resolveSocketServerOptions, SAFE_DEFAULTS };
