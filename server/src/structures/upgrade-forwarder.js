import { ServerResponse } from 'node:http';

/**
 * Restores Node's default upgrade routing for requests Socket.IO does not own.
 *
 * Node passes an `Upgrade` request to the `request` handler (Koa) only while
 * the HTTP server has no `upgrade` listener. Engine.IO adds one, so Strapi's
 * Data Transfer WebSocket (`/admin/transfer/runner/*`, handled inside a Koa
 * route with `ws.handleUpgrade`) never reached Koa and the client timed out
 * (issue #112). This listener hands every upgrade outside the Socket.IO path
 * to the server's `request` listeners, unless another application listener
 * (for example a custom `ws` server) is attached to `upgrade`.
 *
 * @param {object} options - Options.
 * @param {import('node:http').Server} options.httpServer - Strapi's HTTP server.
 * @param {string} options.enginePath - Engine.IO path prefix, e.g. `/socket.io/`.
 * @param {Function[]} options.ownListeners - Upgrade listeners added by Engine.IO.
 * @returns {() => void} Function that removes the listener.
 * @see https://nodejs.org/api/http.html#event-upgrade
 */
function attachUpgradeForwarder({ httpServer, enginePath, ownListeners }) {
	const listener = (req, socket, head) => {
		if (typeof req.url === 'string' && req.url.startsWith(enginePath)) return;
		const others = httpServer.listeners('upgrade').filter((l) => l !== listener && !ownListeners.includes(l));
		if (others.length > 0) return;

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

export { attachUpgradeForwarder };
