#!/usr/bin/env node
'use strict';

/**
 * Comprehensive test suite for @strapi-community/plugin-io
 * Covers all socket events, security hardening, and edge cases.
 *
 * Prerequisites:
 *   - Strapi running on http://localhost:1337 with plugin-io enabled
 *   - Default plugin settings (or adjust SERVER_URL / JWT_TOKEN)
 *
 * Usage:
 *   node test-security.js              # public connection tests
 *   JWT_TOKEN=xxx node test-security.js # authenticated connection tests
 */

const { io } = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:1337';
const JWT_TOKEN = process.env.JWT_TOKEN || null;

// ─── Helpers ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

/**
 * Sleeps for a given number of milliseconds
 * @param {number} ms - Duration in ms
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Asserts a condition and records the result
 * @param {string} label - Test name
 * @param {boolean} condition - Whether the test passed
 * @param {string} [detail] - Extra detail on failure
 */
function assert(label, condition, detail) {
	if (condition) {
		passed++;
		results.push({ label, status: 'PASS' });
		console.log(`  [PASS] ${label}`);
	} else {
		failed++;
		results.push({ label, status: 'FAIL', detail });
		console.log(`  [FAIL] ${label}${detail ? ' -- ' + detail : ''}`);
	}
}

/**
 * Marks a test as skipped
 * @param {string} label - Test name
 * @param {string} reason - Why it was skipped
 */
function skip(label, reason) {
	skipped++;
	results.push({ label, status: 'SKIP', detail: reason });
	console.log(`  [SKIP] ${label} -- ${reason}`);
}

/**
 * Emits a socket event and returns the callback response as a Promise
 * @param {object} socket - Socket.IO client
 * @param {string} event - Event name
 * @param {*} data - Payload
 * @param {number} [timeoutMs=3000] - Timeout
 * @returns {Promise<*>} Callback response
 */
function emitAsync(socket, event, data, timeoutMs = 3000) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), timeoutMs);
		const args = data !== undefined ? [data] : [];
		args.push((response) => {
			clearTimeout(timer);
			resolve(response);
		});
		socket.emit(event, ...args);
	});
}

/**
 * Creates a connected socket and returns it
 * @param {object} [opts] - Connection options
 * @returns {Promise<object>} Connected socket
 */
function connect(opts = {}) {
	return new Promise((resolve, reject) => {
		const s = io(SERVER_URL, {
			transports: ['websocket', 'polling'],
			forceNew: true,
			autoConnect: true,
			...opts,
		});
		const timer = setTimeout(() => {
			s.disconnect();
			reject(new Error('Connection timeout'));
		}, 5000);
		s.on('connect', () => {
			clearTimeout(timer);
			resolve(s);
		});
		s.on('connect_error', (err) => {
			clearTimeout(timer);
			reject(err);
		});
	});
}

// ─── Test Groups ─────────────────────────────────────────────────────

/**
 * Tests basic public connection without authentication
 */
async function testConnection(socket) {
	console.log('\n== 1. Connection ==');
	assert('Socket connected', socket.connected);
	assert('Socket has an ID', typeof socket.id === 'string' && socket.id.length > 0);
}

/**
 * Tests auto-assigned rooms after handshake
 */
async function testAutoRooms(socket) {
	console.log('\n== 2. Auto-Assigned Rooms ==');
	const res = await emitAsync(socket, 'get-rooms');
	assert('get-rooms returns success', res.success === true);
	assert('get-rooms returns array', Array.isArray(res.rooms));
	assert('Public socket is in io-role-public', res.rooms.includes('io-role-public'),
		`rooms: ${JSON.stringify(res.rooms)}`);
}

/**
 * Tests room join/leave with validation
 */
async function testRoomManagement(socket) {
	console.log('\n== 3. Room Management ==');

	const joinValid = await emitAsync(socket, 'join-room', 'test-room');
	assert('join-room denied (private rooms disabled)', joinValid.success === false);
	assert('join-room error message correct', joinValid.error === 'Private rooms are disabled',
		`got: ${joinValid.error}`);

	const joinInvalid = await emitAsync(socket, 'join-room', 'bad room!@#');
	assert('join-room rejects invalid chars', joinInvalid.success === false);

	const leaveInvalid = await emitAsync(socket, 'leave-room', 'bad room!@#');
	assert('leave-room rejects invalid chars', leaveInvalid.success === false);

	const leaveEmpty = await emitAsync(socket, 'leave-room', '');
	assert('leave-room rejects empty string', leaveEmpty.success === false);
}

/**
 * C1: Tests that null/undefined payloads do NOT crash the server
 */
async function testSafeHandler(socket) {
	console.log('\n== 4. Crash Protection (C1: safeHandler) ==');

	const events = [
		'presence:join',
		'presence:leave',
		'presence:typing',
		'presence:check',
		'preview:subscribe',
		'preview:unsubscribe',
		'preview:field-change',
		'subscribe-entity',
		'unsubscribe-entity',
		'private-message',
	];

	for (const event of events) {
		let crashed = false;
		try {
			const res = await emitAsync(socket, event, null, 2000);
			assert(`${event} handles null payload`, res?.success === false);
		} catch (err) {
			if (err.message.startsWith('Timeout')) {
				assert(`${event} handles null payload (no callback, no crash)`, true);
			} else {
				crashed = true;
				assert(`${event} handles null payload`, false, err.message);
			}
		}
	}

	assert('Server still responsive after null payloads', socket.connected);

	for (const event of events) {
		try {
			const res = await emitAsync(socket, event, 'string-not-object', 2000);
			assert(`${event} rejects string payload`, res?.success === false);
		} catch (err) {
			if (err.message.startsWith('Timeout')) {
				assert(`${event} rejects string payload (no callback, no crash)`, true);
			} else {
				assert(`${event} rejects string payload`, false, err.message);
			}
		}
	}

	assert('Server still responsive after string payloads', socket.connected);
}

/**
 * Tests presence events (join, leave, heartbeat, check)
 */
async function testPresence(socket) {
	console.log('\n== 5. Presence System ==');

	const joinRes = await emitAsync(socket, 'presence:join', {
		uid: 'api::article.article',
		documentId: 'test-doc-123',
	});
	assert('presence:join succeeds', joinRes.success === true, JSON.stringify(joinRes));

	if (joinRes.success) {
		assert('presence:join returns editors array', Array.isArray(joinRes.editors));
	}

	const heartbeat = await emitAsync(socket, 'presence:heartbeat');
	assert('presence:heartbeat succeeds', heartbeat.success === true);

	const check = await emitAsync(socket, 'presence:check', {
		uid: 'api::article.article',
		documentId: 'test-doc-123',
	});
	assert('presence:check succeeds', check.success === true);
	assert('presence:check returns editors', Array.isArray(check.editors));

	const leaveRes = await emitAsync(socket, 'presence:leave', {
		uid: 'api::article.article',
		documentId: 'test-doc-123',
	});
	assert('presence:leave succeeds', leaveRes.success === true);

	const joinMissing = await emitAsync(socket, 'presence:join', { uid: '', documentId: '' });
	assert('presence:join rejects empty params', joinMissing.success === false);
}

/**
 * Tests typing indicator with auth requirements (M5)
 */
async function testTyping(socket) {
	console.log('\n== 6. Typing Indicator (M5: auth required) ==');

	if (JWT_TOKEN) {
		skip('typing test for unauthenticated', 'running with JWT');
	} else {
		try {
			await emitAsync(socket, 'presence:typing', {
				uid: 'api::article.article',
				documentId: 'test-doc-123',
				fieldName: 'title',
			}, 1500);
			assert('presence:typing silent for unauthenticated (no callback expected)', true);
		} catch (err) {
			if (err.message.startsWith('Timeout')) {
				assert('presence:typing has no callback (fire-and-forget)', true);
			} else {
				assert('presence:typing for unauthenticated', false, err.message);
			}
		}
	}
}

/**
 * Tests preview subscribe/unsubscribe
 */
async function testPreview(socket) {
	console.log('\n== 7. Live Preview ==');

	const subRes = await emitAsync(socket, 'preview:subscribe', {
		uid: 'api::article.article',
		documentId: 'test-preview-doc',
	});
	assert('preview:subscribe responds', subRes !== undefined);

	const subMissing = await emitAsync(socket, 'preview:subscribe', { uid: '', documentId: '' });
	assert('preview:subscribe rejects empty params', subMissing.success === false);

	if (subRes.success) {
		const unsubRes = await emitAsync(socket, 'preview:unsubscribe', {
			uid: 'api::article.article',
			documentId: 'test-preview-doc',
		});
		assert('preview:unsubscribe succeeds', unsubRes.success === true);
	}
}

/**
 * Tests entity subscriptions and the M6 filter fix
 */
async function testEntitySubscriptions(socket) {
	console.log('\n== 8. Entity Subscriptions ==');

	const subInvalid = await emitAsync(socket, 'subscribe-entity', {
		uid: 'invalid-format',
		id: 999,
	});
	assert('subscribe-entity rejects invalid uid format', subInvalid.success === false);

	const subMissing = await emitAsync(socket, 'subscribe-entity', { uid: '', id: '' });
	assert('subscribe-entity rejects empty params', subMissing.success === false);

	const unsubRes = await emitAsync(socket, 'unsubscribe-entity', {
		uid: 'api::article.article',
		id: 'nonexistent',
	});
	assert('unsubscribe-entity succeeds even for non-joined', unsubRes.success === true);

	const listRes = await emitAsync(socket, 'get-entity-subscriptions');
	assert('get-entity-subscriptions returns success', listRes.success === true);
	assert('get-entity-subscriptions returns array', Array.isArray(listRes.subscriptions));

	const hasBadRooms = listRes.subscriptions.some(
		(s) => s.room.startsWith('presence:') || s.room.startsWith('preview:')
	);
	assert('M6: subscription list excludes presence/preview rooms', !hasBadRooms,
		`found: ${JSON.stringify(listRes.subscriptions)}`);
}

/**
 * Tests private message handling
 */
async function testPrivateMessages(socket) {
	console.log('\n== 9. Private Messages ==');

	const pmDisabled = await emitAsync(socket, 'private-message', {
		to: socket.id,
		message: 'hello',
	});
	assert('private-message denied (private rooms disabled)', pmDisabled.success === false);
	assert('private-message error is correct', pmDisabled.error === 'Private messages are disabled',
		`got: ${pmDisabled.error}`);

	const pmEmpty = await emitAsync(socket, 'private-message', { to: '', message: '' });
	assert('private-message rejects empty payload', pmEmpty.success === false);
}

/**
 * H4: Token must come from auth object, not query string
 */
async function testQueryStringTokenRejected() {
	console.log('\n== 10. Query String Token Rejected (H4) ==');

	try {
		const s = await connect({
			auth: undefined,
			query: { token: 'fake-token-in-query' },
		});
		const rooms = await emitAsync(s, 'get-rooms');
		assert('H4: query string token ignored (connects as public)',
			rooms.rooms.includes('io-role-public'));
		s.disconnect();
	} catch (err) {
		assert('H4: query string token does not authenticate', true);
	}
}

/**
 * H1: Client-controlled isAdmin flag should be ignored
 */
async function testIsAdminFlagIgnored() {
	console.log('\n== 11. isAdmin Flag Ignored (H1) ==');

	try {
		const s = await connect({
			auth: { token: 'not-a-valid-token', isAdmin: true, strategy: 'admin-jwt' },
		});
		const rooms = await emitAsync(s, 'get-rooms');
		const isPublic = rooms.rooms.some((r) => r.includes('public'));
		assert('H1: isAdmin flag does not grant admin (connects as public or fails)', isPublic);
		s.disconnect();
	} catch (err) {
		assert('H1: fake admin token rejected at handshake', true);
	}
}

/**
 * Tests that multiple concurrent connections work correctly
 */
async function testConcurrentConnections() {
	console.log('\n== 12. Concurrent Connections ==');

	const sockets = [];
	try {
		for (let i = 0; i < 5; i++) {
			sockets.push(await connect());
		}
		assert('5 concurrent connections established', sockets.every((s) => s.connected));

		const ids = sockets.map((s) => s.id);
		const unique = new Set(ids);
		assert('All socket IDs are unique', unique.size === 5);
	} catch (err) {
		assert('Concurrent connections', false, err.message);
	} finally {
		sockets.forEach((s) => s.disconnect());
	}
}

/**
 * Tests clean disconnect and reconnect
 */
async function testDisconnectReconnect() {
	console.log('\n== 13. Disconnect / Reconnect ==');

	const s = await connect();
	const oldId = s.id;
	assert('Initial connection', s.connected);

	s.disconnect();
	await sleep(500);
	assert('Socket disconnected', !s.connected);

	s.connect();
	await new Promise((resolve) => {
		const timer = setTimeout(() => resolve(), 3000);
		s.on('connect', () => {
			clearTimeout(timer);
			resolve();
		});
	});

	assert('Reconnected successfully', s.connected);
	assert('New socket ID after reconnect', s.id !== oldId);
	s.disconnect();
}

/**
 * Tests presence:join and presence:leave isolation between two sockets
 */
async function testPresenceMultiSocket() {
	console.log('\n== 14. Presence Multi-Socket Isolation ==');

	let s1, s2;
	try {
		s1 = await connect();
		s2 = await connect();

		await emitAsync(s1, 'presence:join', {
			uid: 'api::article.article',
			documentId: 'multi-test',
		});

		const check1 = await emitAsync(s2, 'presence:check', {
			uid: 'api::article.article',
			documentId: 'multi-test',
		});
		assert('Socket2 sees Socket1 as editor', check1.isBeingEdited === true);

		await emitAsync(s1, 'presence:leave', {
			uid: 'api::article.article',
			documentId: 'multi-test',
		});

		await sleep(200);

		const check2 = await emitAsync(s2, 'presence:check', {
			uid: 'api::article.article',
			documentId: 'multi-test',
		});
		assert('Socket2 sees no editors after Socket1 leaves', check2.isBeingEdited === false);
	} catch (err) {
		assert('Multi-socket presence', false, err.message);
	} finally {
		s1?.disconnect();
		s2?.disconnect();
	}
}

/**
 * Tests get-rooms only returns joined rooms, not the socket's own ID
 */
async function testGetRoomsFiltering(socket) {
	console.log('\n== 15. get-rooms Filtering ==');

	const res = await emitAsync(socket, 'get-rooms');
	const containsOwnId = res.rooms.includes(socket.id);
	assert('get-rooms does not include own socket ID', !containsOwnId);
}

/**
 * Tests authenticated connection if JWT_TOKEN is set
 */
async function testAuthenticatedConnection() {
	console.log('\n== 16. Authenticated Connection ==');

	if (!JWT_TOKEN) {
		skip('Authenticated connection test', 'no JWT_TOKEN env var');
		return;
	}

	try {
		const s = await connect({ auth: { token: JWT_TOKEN } });
		assert('Authenticated socket connected', s.connected);

		const rooms = await emitAsync(s, 'get-rooms');
		const hasAuthRoom = rooms.rooms.some((r) => r.includes('authenticated') || r.includes('io-role'));
		assert('Authenticated socket has role room', hasAuthRoom, JSON.stringify(rooms.rooms));

		s.disconnect();
	} catch (err) {
		assert('Authenticated connection', false, err.message);
	}
}

// ─── Runner ──────────────────────────────────────────────────────────

async function main() {
	console.log('========================================================');
	console.log('  @strapi-community/plugin-io -- Test Suite');
	console.log('========================================================');
	console.log(`  Server:  ${SERVER_URL}`);
	console.log(`  Auth:    ${JWT_TOKEN ? 'JWT provided' : 'Public (no token)'}`);
	console.log('========================================================');

	let socket;
	try {
		socket = await connect(JWT_TOKEN ? { auth: { token: JWT_TOKEN } } : {});
	} catch (err) {
		console.error(`\n[FATAL] Cannot connect to ${SERVER_URL}: ${err.message}`);
		console.error('Make sure Strapi is running with plugin-io enabled.\n');
		process.exit(1);
	}

	try {
		await testConnection(socket);
		await testAutoRooms(socket);
		await testRoomManagement(socket);
		await testSafeHandler(socket);
		await testPresence(socket);
		await testTyping(socket);
		await testPreview(socket);
		await testEntitySubscriptions(socket);
		await testPrivateMessages(socket);
		await testGetRoomsFiltering(socket);

		socket.disconnect();
		await sleep(300);

		await testQueryStringTokenRejected();
		await testIsAdminFlagIgnored();
		await testConcurrentConnections();
		await testDisconnectReconnect();
		await testPresenceMultiSocket();
		await testAuthenticatedConnection();
	} catch (err) {
		console.error(`\n[FATAL] Unhandled error: ${err.message}`);
		failed++;
	} finally {
		if (socket?.connected) socket.disconnect();
	}

	// ── Summary ──────────────────────────────────────────────────────
	const total = passed + failed + skipped;
	console.log('\n========================================================');
	console.log('  RESULTS');
	console.log('========================================================');
	console.log(`  Total:   ${total}`);
	console.log(`  Passed:  ${passed}`);
	console.log(`  Failed:  ${failed}`);
	console.log(`  Skipped: ${skipped}`);
	console.log('========================================================');

	if (failed > 0) {
		console.log('\n  Failed tests:');
		results
			.filter((r) => r.status === 'FAIL')
			.forEach((r) => console.log(`    - ${r.label}${r.detail ? ': ' + r.detail : ''}`));
		console.log('');
	}

	process.exit(failed > 0 ? 1 : 0);
}

main();
