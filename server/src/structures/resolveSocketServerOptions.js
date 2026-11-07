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
 *
 * Always allowed: requests without an Origin header (server-to-server
 * clients, which browsers never are), same-origin requests (the Strapi admin
 * itself) and the origins of `server.url` / `admin.url`. Any other browser
 * origin must be listed, for polling and WebSocket alike. An empty list
 * therefore means "same origin only".
 *
 * @param {string | undefined} origin - Request Origin header.
 * @param {string[]} allowed - Allowed origins from the settings.
 * @param {string} [host] - Request Host header.
 * @param {string[]} [trusted] - Origins of the Strapi server and admin URLs.
 * @returns {boolean} True when allowed.
 */
function isOriginAllowed(origin, allowed, host, trusted = []) {
	if (!origin) return true;
	if (allowed?.includes(origin) || trusted.includes(origin)) return true;
	try {
		return Boolean(host) && new URL(origin).host === host;
	} catch {
		return false;
	}
}

/**
 * Turns absolute `server.url` / `admin.url` values into origins. Relative
 * values (the default `/admin`) are same-origin and need no entry.
 *
 * @param {Array<string | undefined>} urls - Configured URLs.
 * @returns {string[]} Origins.
 */
function originsOf(urls) {
	const result = [];
	for (const url of urls) {
		if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) continue;
		try {
			result.push(new URL(url).origin);
		} catch {
			// ignore malformed URLs; Strapi validates them itself
		}
	}
	return [...new Set(result)];
}

/**
 * Merges `config.socket.serverOptions` with the plugin defaults. `cors` and
 * `allowRequest` follow the admin setting "Allowed origins" unless set in the
 * config, which always wins.
 *
 * @param {SocketServerOptions | null | undefined} userOptions - Options from the plugin config.
 * @param {() => { cors: { origins: string[] } }} [getSettings] - Current admin settings.
 * @param {{ trustedOrigins?: string[] }} [extra] - Origins that are always allowed (server and admin URL).
 * @returns {SocketServerOptions} Options for `new Server(httpServer, options)`.
 * @see https://socket.io/docs/v4/server-options/
 */
function resolveSocketServerOptions(userOptions, getSettings, { trustedOrigins = [] } = {}) {
	const options = userOptions && typeof userOptions === 'object' ? { ...userOptions } : {};
	const resolved = { ...SAFE_DEFAULTS, ...options };

	if (getSettings && options.cors === undefined) {
		resolved.cors = {
			origin(origin, callback) {
				const allowed = getSettings().cors.origins;
				// CORS headers only for listed or trusted cross-origin callers; same-origin
				// requests need none. allowRequest below does the actual refusing.
				callback(null, Boolean(origin) && (allowed.includes(origin) || trustedOrigins.includes(origin)));
			},
			methods: ['GET', 'POST'],
		};
	}
	if (getSettings && options.allowRequest === undefined) {
		resolved.allowRequest = (req, callback) => {
			callback(null, isOriginAllowed(req.headers.origin, getSettings().cors.origins, req.headers.host, trustedOrigins));
		};
	}
	return resolved;
}

export { isOriginAllowed, originsOf, resolveSocketServerOptions, SAFE_DEFAULTS };
