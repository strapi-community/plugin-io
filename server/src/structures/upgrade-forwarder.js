/**
 * Restores Node's default upgrade routing for requests Socket.IO does not own.
 *
 * Node passes an `Upgrade` request to the `request` handler (Koa) only while
 * the HTTP server does not accept upgrades, and by default it accepts them as
 * soon as any `upgrade` listener exists. Engine.IO adds one, so Strapi's Data
 * Transfer WebSocket (`/admin/transfer/runner/*`, handled inside a Koa route
 * with `ws.handleUpgrade`) never reached Koa and the client timed out (#112).
 *
 * The plugin wraps the server's `shouldUpgradeCallback` (Node 22.21+ / 24.9+,
 * the supported engines) so only upgrades on the Socket.IO path, or upgrades
 * another application listener is waiting for, are accepted. Every other
 * request, including `Upgrade: h2c` requests with a body, reaches Koa exactly
 * as it would without the plugin.
 *
 * @param {object} options - Options.
 * @param {import('node:http').Server} options.httpServer - Strapi's HTTP server.
 * @param {string} options.enginePath - Engine.IO path prefix, e.g. `/socket.io/`.
 * @param {Function[]} options.ownListeners - Upgrade listeners added by Engine.IO.
 * @returns {(() => void) | null} Function that restores the previous callback,
 *   or `null` when the running Node.js has no `shouldUpgradeCallback`
 *   (outside the supported engines).
 * @see https://nodejs.org/docs/latest-v24.x/api/http.html#httpcreateserveroptions-requestlistener
 */
function attachUpgradeForwarder({ httpServer, enginePath, ownListeners }) {
	if (typeof httpServer.shouldUpgradeCallback !== 'function') return null;

	const isEngineRequest = (req) => typeof req.url === 'string' && req.url.startsWith(enginePath);
	const hasForeignListener = () => httpServer.listeners('upgrade').some((l) => !ownListeners.includes(l));

	const original = httpServer.shouldUpgradeCallback;
	const shouldUpgrade = function shouldUpgradeCallback(req) {
		if (isEngineRequest(req) || hasForeignListener()) return original.call(this, req);
		return false;
	};
	httpServer.shouldUpgradeCallback = shouldUpgrade;
	return () => {
		if (httpServer.shouldUpgradeCallback === shouldUpgrade) httpServer.shouldUpgradeCallback = original;
	};
}

export { attachUpgradeForwarder };
