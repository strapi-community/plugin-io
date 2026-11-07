import { ServerResponse } from 'node:http';

const BODY_REJECTION = 'Upgrade requests with a body need Node.js 22.21, 24.9 or newer.';

/**
 * Checks whether a request carries a body (Content-Length > 0 or any
 * Transfer-Encoding).
 *
 * @param {import('node:http').IncomingMessage} req - Request.
 * @returns {boolean} True when a body follows the headers.
 */
const hasBody = (req) =>
	Boolean(req.headers['transfer-encoding']) || Number.parseInt(req.headers['content-length'] || '0', 10) > 0;

/**
 * Restores Node's default upgrade routing for requests Socket.IO does not own.
 *
 * Node passes an `Upgrade` request to the `request` handler (Koa) only while
 * the HTTP server does not accept upgrades, and by default it accepts them as
 * soon as any `upgrade` listener exists. Engine.IO adds one, so Strapi's Data
 * Transfer WebSocket (`/admin/transfer/runner/*`, handled inside a Koa route
 * with `ws.handleUpgrade`) never reached Koa and the client timed out (#112).
 *
 * On Node 22.21+ / 24.9+ the plugin wraps the server's `shouldUpgradeCallback`
 * so only upgrades on the Socket.IO path, or upgrades another application
 * listener is waiting for, are accepted. Every other request, including
 * `Upgrade: h2c` requests with a body, reaches Koa exactly as it would without
 * the plugin.
 *
 * On older Node versions a fallback `upgrade` listener hands bodyless foreign
 * upgrades to the `request` listeners. A foreign upgrade with a body cannot be
 * replayed there (Node has already stopped parsing the body), so it gets a
 * `400` with a clear message instead of reaching Koa with an empty body.
 *
 * @param {object} options - Options.
 * @param {import('node:http').Server} options.httpServer - Strapi's HTTP server.
 * @param {string} options.enginePath - Engine.IO path prefix, e.g. `/socket.io/`.
 * @param {Function[]} options.ownListeners - Upgrade listeners added by Engine.IO.
 * @param {boolean} [options.legacy] - Force the fallback listener (tests only).
 * @returns {() => void} Function that restores the previous behaviour.
 * @see https://nodejs.org/docs/latest-v22.x/api/http.html#event-upgrade
 */
function attachUpgradeForwarder({ httpServer, enginePath, ownListeners, legacy = false }) {
	const isEngineRequest = (req) => typeof req.url === 'string' && req.url.startsWith(enginePath);
	const foreignListeners = (self) =>
		httpServer.listeners('upgrade').filter((l) => l !== self && !ownListeners.includes(l));

	if (!legacy && typeof httpServer.shouldUpgradeCallback === 'function') {
		const original = httpServer.shouldUpgradeCallback;
		const shouldUpgrade = function shouldUpgradeCallback(req) {
			if (isEngineRequest(req) || foreignListeners(null).length > 0) return original.call(this, req);
			return false;
		};
		httpServer.shouldUpgradeCallback = shouldUpgrade;
		return () => {
			if (httpServer.shouldUpgradeCallback === shouldUpgrade) httpServer.shouldUpgradeCallback = original;
		};
	}

	const listener = (req, socket, head) => {
		if (isEngineRequest(req)) return;
		if (foreignListeners(listener).length > 0) return;

		if (hasBody(req)) {
			socket.end(
				'HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\n' +
					`Content-Length: ${Buffer.byteLength(BODY_REJECTION)}\r\n\r\n${BODY_REJECTION}`
			);
			return;
		}

		if (head && head.length) socket.unshift(head);
		const res = new ServerResponse(req);
		res.shouldKeepAlive = false;
		res.assignSocket(socket);
		res.on('finish', () => {
			res.detachSocket(socket);
			socket.end();
		});
		httpServer.emit('request', req, res);
	};

	httpServer.on('upgrade', listener);
	return () => httpServer.off('upgrade', listener);
}

export { attachUpgradeForwarder, hasBody };
