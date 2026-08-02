'use strict';

const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const net = require('node:net');
const test = require('node:test');
const { Server } = require('socket.io');

const {
	resolveSocketServerOptions,
	SAFE_DEFAULTS,
} = require('../server/structures/resolveSocketServerOptions');

test('SAFE_DEFAULTS disable destroyUpgrade for coexistence with Strapi transfer', () => {
	assert.equal(SAFE_DEFAULTS.destroyUpgrade, false);
});

test('resolveSocketServerOptions applies destroyUpgrade:false by default', () => {
	const options = resolveSocketServerOptions({
		cors: { origin: 'http://127.0.0.1:8080', methods: ['GET', 'POST'] },
	});

	assert.equal(options.destroyUpgrade, false);
	assert.deepEqual(options.cors, {
		origin: 'http://127.0.0.1:8080',
		methods: ['GET', 'POST'],
	});
});

test('resolveSocketServerOptions lets callers explicitly override destroyUpgrade', () => {
	const options = resolveSocketServerOptions({ destroyUpgrade: true });
	assert.equal(options.destroyUpgrade, true);
});

test('resolveSocketServerOptions tolerates nullish user options', () => {
	assert.deepEqual(resolveSocketServerOptions(undefined), { destroyUpgrade: false });
	assert.deepEqual(resolveSocketServerOptions(null), { destroyUpgrade: false });
});

/**
 * Opens a raw TCP client that performs an HTTP Upgrade to `path` and
 * reports whether the server closed the socket before any response bytes.
 *
 * @param {number} port
 * @param {string} path
 * @param {number} waitMs
 * @returns {Promise<{ endedEarly: boolean, bytesRead: number }>}
 */
function probeUpgrade(port, path, waitMs) {
	return new Promise((resolve, reject) => {
		const socket = net.connect({ port, host: '127.0.0.1' });
		let endedEarly = false;
		let settled = false;

		const finish = (result) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve(result);
		};

		socket.once('error', reject);
		socket.once('connect', () => {
			socket.write(
				`GET ${path} HTTP/1.1\r\n` +
					`Host: 127.0.0.1:${port}\r\n` +
					'Upgrade: websocket\r\n' +
					'Connection: Upgrade\r\n' +
					'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
					'Sec-WebSocket-Version: 13\r\n' +
					'\r\n'
			);
		});

		socket.once('end', () => {
			// Engine.IO ends unhandled upgrades with socket.end() when destroyUpgrade is true.
			endedEarly = socket.bytesRead <= 0;
		});

		setTimeout(() => {
			finish({ endedEarly, bytesRead: socket.bytesRead });
		}, waitMs);
	});
}

test('default Engine.IO destroyUpgrade ends Strapi transfer upgrades after timeout', async () => {
	const httpServer = createServer((_req, res) => {
		res.writeHead(200);
		res.end('ok');
	});

	// Intentionally omit destroyUpgrade (Engine.IO default is true).
	const io = new Server(httpServer, {
		cors: { origin: '*' },
	});

	await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
	const { port } = httpServer.address();

	try {
		const result = await probeUpgrade(port, '/admin/transfer/runner/push', 1300);
		assert.equal(
			result.endedEarly,
			true,
			'expected Engine.IO default to end non-/socket.io upgrades'
		);
	} finally {
		io.close();
		await new Promise((resolve) => httpServer.close(resolve));
	}
});

test('resolved options keep Strapi transfer upgrades alive past destroyUpgradeTimeout', async () => {
	const httpServer = createServer((_req, res) => {
		res.writeHead(200);
		res.end('ok');
	});

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let transferTimer;

	// Simulate Strapi transfer: slow upgrade handler on /admin/transfer/*.
	httpServer.on('upgrade', (req, socket) => {
		if (!req.url?.startsWith('/admin/transfer/')) return;
		transferTimer = setTimeout(() => {
			if (!socket.writable || socket.destroyed) return;
			socket.write(
				'HTTP/1.1 101 Switching Protocols\r\n' +
					'Upgrade: websocket\r\n' +
					'Connection: Upgrade\r\n' +
					'Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=\r\n' +
					'\r\n'
			);
			socket.end();
		}, 1100);
	});

	const io = new Server(httpServer, resolveSocketServerOptions({ cors: { origin: '*' } }));

	await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
	const { port } = httpServer.address();

	try {
		const result = await probeUpgrade(port, '/admin/transfer/runner/push', 1500);
		assert.equal(
			result.endedEarly,
			false,
			'destroyUpgrade:false must not kill /admin/transfer upgrades'
		);
		assert.ok(result.bytesRead > 0, 'transfer handler should still be able to respond');
	} finally {
		if (transferTimer) clearTimeout(transferTimer);
		await new Promise((resolve) => io.close(() => resolve()));
		await new Promise((resolve) => httpServer.close(() => resolve()));
	}
});
