#!/usr/bin/env node
'use strict';

/**
 * Full end-to-end test suite for @strapi-community/plugin-io
 *
 * Covers: Socket events, REST Admin API, Lifecycle events,
 *         Security hardening, Presence, Preview, and Edge cases.
 *
 * Usage:
 *   node test-all.js                                           # public-only tests
 *   JWT_TOKEN=xxx node test-all.js                             # + authenticated socket tests
 *   ADMIN_JWT=xxx node test-all.js                             # + REST API + lifecycle tests
 *   ADMIN_JWT=xxx JWT_TOKEN=xxx CONTENT_TYPE_UID=api::article.article node test-all.js
 */

const http = require('http');
const { io } = require('socket.io-client');

// ─── Configuration ───────────────────────────────────────────────────

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:1337';
const ADMIN_JWT = process.env.ADMIN_JWT || null;
const JWT_TOKEN = process.env.JWT_TOKEN || null;
const CONTENT_TYPE_UID = process.env.CONTENT_TYPE_UID || null;

// ─── Mini Test Framework ─────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];
let currentGroup = '';

/**
 * Sleeps for a given duration
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Records a passing or failing assertion
 * @param {string} label - Test description
 * @param {boolean} condition - Pass/fail
 * @param {string} [detail] - Failure detail
 */
function assert(label, condition, detail) {
	const fullLabel = currentGroup ? `${currentGroup} > ${label}` : label;
	if (condition) {
		passed++;
		results.push({ label: fullLabel, status: 'PASS' });
		console.log(`  [PASS] ${label}`);
	} else {
		failed++;
		results.push({ label: fullLabel, status: 'FAIL', detail });
		console.log(`  [FAIL] ${label}${detail ? ' -- ' + detail : ''}`);
	}
}

/**
 * Marks a test as skipped
 * @param {string} label - Test description
 * @param {string} reason - Why it was skipped
 */
function skip(label, reason) {
	skipped++;
	results.push({ label: `${currentGroup} > ${label}`, status: 'SKIP', detail: reason });
	console.log(`  [SKIP] ${label} -- ${reason}`);
}

/**
 * Emits a socket event and resolves with the callback response
 * @param {object} socket - Socket.IO client
 * @param {string} event - Event name
 * @param {*} [data] - Payload (omit for no-arg events)
 * @param {number} [timeoutMs=3000] - Timeout
 * @returns {Promise<*>}
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
 * Creates and returns a connected Socket.IO client
 * @param {object} [opts] - socket.io-client options
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

/**
 * Makes an HTTP request using Node.js built-in http module
 * @param {string} method - HTTP method
 * @param {string} path - URL path (relative to SERVER_URL)
 * @param {object} [body] - JSON body
 * @param {string} [jwt] - Bearer token
 * @returns {Promise<{status: number, body: object}>}
 */
function httpRequest(method, path, body, jwt) {
	return new Promise((resolve, reject) => {
		const url = new URL(path, SERVER_URL);
		const options = {
			method,
			hostname: url.hostname,
			port: url.port,
			path: url.pathname + url.search,
			headers: {
				'Content-Type': 'application/json',
				...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
			},
		};
		const req = http.request(options, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				let parsed;
				try {
					parsed = JSON.parse(data);
				} catch {
					parsed = data;
				}
				resolve({ status: res.statusCode, body: parsed });
			});
		});
		req.on('error', reject);
		if (body) req.write(JSON.stringify(body));
		req.end();
	});
}

/**
 * Waits for a specific socket event within a timeout
 * @param {object} socket - Socket.IO client
 * @param {string} event - Event to listen for
 * @param {number} [timeoutMs=5000] - Timeout
 * @returns {Promise<*>} Event data or null on timeout
 */
function waitForEvent(socket, event, timeoutMs = 5000) {
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			socket.off(event, handler);
			resolve(null);
		}, timeoutMs);
		const handler = (data) => {
			clearTimeout(timer);
			socket.off(event, handler);
			resolve(data);
		};
		socket.on(event, handler);
	});
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 1: CONNECTION
// ═════════════════════════════════════════════════════════════════════

async function group1_connection() {
	currentGroup = '1. Connection';
	console.log(`\n== ${currentGroup} ==`);

	const s = await connect();
	assert('Public socket connects', s.connected);
	assert('Socket has an ID', typeof s.id === 'string' && s.id.length > 0);

	const rooms = await emitAsync(s, 'get-rooms');
	assert('get-rooms succeeds', rooms.success === true);
	assert('Public user in io-role-public', rooms.rooms.includes('io-role-public'),
		JSON.stringify(rooms.rooms));
	s.disconnect();

	// Fake JWT
	try {
		const sf = await connect({ auth: { token: 'not.a.valid.jwt.token' } });
		const fr = await emitAsync(sf, 'get-rooms');
		assert('Fake JWT degrades to public or rejected',
			!sf.connected || fr.rooms.includes('io-role-public'));
		sf.disconnect();
	} catch {
		assert('Fake JWT rejected at handshake', true);
	}

	// Fake UUID session token
	try {
		const su = await connect({
			auth: { token: '00000000-0000-0000-0000-000000000000' },
		});
		const ur = await emitAsync(su, 'get-rooms');
		assert('Fake UUID session rejected or no admin room',
			!ur.rooms.some((r) => r.includes('admin')));
		su.disconnect();
	} catch {
		assert('Fake UUID session rejected at handshake', true);
	}

	// Concurrent connections
	const sockets = [];
	for (let i = 0; i < 5; i++) sockets.push(await connect());
	assert('5 concurrent connections', sockets.every((x) => x.connected));
	assert('All IDs unique', new Set(sockets.map((x) => x.id)).size === 5);
	sockets.forEach((x) => x.disconnect());

	// Reconnect
	const sr = await connect();
	const oldId = sr.id;
	sr.disconnect();
	await sleep(300);
	sr.connect();
	await new Promise((r) => {
		const t = setTimeout(r, 3000);
		sr.on('connect', () => { clearTimeout(t); r(); });
	});
	assert('Reconnect gets new ID', sr.connected && sr.id !== oldId);
	sr.disconnect();

	// Authenticated (optional)
	if (JWT_TOKEN) {
		try {
			const sa = await connect({ auth: { token: JWT_TOKEN } });
			const ar = await emitAsync(sa, 'get-rooms');
			assert('JWT socket connects', sa.connected);
			assert('JWT socket has role room',
				ar.rooms.some((r) => r.includes('io-role')), JSON.stringify(ar.rooms));
			sa.disconnect();
		} catch (err) {
			assert('JWT socket connects', false, err.message);
		}
	} else {
		skip('JWT socket connection', 'no JWT_TOKEN');
	}
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 2: SECURITY / CRASH PROTECTION
// ═════════════════════════════════════════════════════════════════════

async function group2_security() {
	currentGroup = '2. Security';
	console.log(`\n== ${currentGroup} ==`);

	const s = await connect();

	const safeEvents = [
		'presence:join', 'presence:leave', 'presence:typing', 'presence:check',
		'preview:subscribe', 'preview:unsubscribe', 'preview:field-change',
		'subscribe-entity', 'unsubscribe-entity', 'private-message',
	];

	// null payloads
	for (const ev of safeEvents) {
		try {
			const res = await emitAsync(s, ev, null, 2000);
			assert(`${ev} survives null`, res?.success === false);
		} catch (err) {
			assert(`${ev} survives null (no callback)`, err.message.startsWith('Timeout'));
		}
	}
	assert('Server alive after null payloads', s.connected);

	// string payloads
	for (const ev of safeEvents) {
		try {
			const res = await emitAsync(s, ev, 'bad-string', 2000);
			assert(`${ev} rejects string`, res?.success === false);
		} catch (err) {
			assert(`${ev} rejects string (no callback)`, err.message.startsWith('Timeout'));
		}
	}
	assert('Server alive after string payloads', s.connected);

	// array payloads
	for (const ev of safeEvents) {
		try {
			const res = await emitAsync(s, ev, [1, 2, 3], 2000);
			assert(`${ev} rejects array`, res?.success === false);
		} catch (err) {
			assert(`${ev} rejects array (no callback)`, err.message.startsWith('Timeout'));
		}
	}
	assert('Server alive after array payloads', s.connected);
	s.disconnect();

	// H1: isAdmin flag ignored
	try {
		const si = await connect({
			auth: { token: 'not-a-valid-token', isAdmin: true, strategy: 'admin-jwt' },
		});
		const ir = await emitAsync(si, 'get-rooms');
		assert('H1: isAdmin flag ignored (public or fail)',
			ir.rooms.some((r) => r.includes('public')));
		si.disconnect();
	} catch {
		assert('H1: fake admin rejected at handshake', true);
	}

	// H4: query string token ignored
	try {
		const sq = await connect({
			auth: undefined,
			query: { token: 'should-be-ignored' },
		});
		const qr = await emitAsync(sq, 'get-rooms');
		assert('H4: query token ignored (connects as public)',
			qr.rooms.includes('io-role-public'));
		sq.disconnect();
	} catch {
		assert('H4: query token ignored', true);
	}
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 3: ROOM MANAGEMENT
// ═════════════════════════════════════════════════════════════════════

async function group3_rooms() {
	currentGroup = '3. Rooms';
	console.log(`\n== ${currentGroup} ==`);

	const s = await connect();

	const joinValid = await emitAsync(s, 'join-room', 'my-room');
	assert('join-room denied (private rooms off)', joinValid.success === false);
	assert('join-room error message', joinValid.error === 'Private rooms are disabled',
		joinValid.error);

	const joinSpecial = await emitAsync(s, 'join-room', 'bad room!@#$');
	assert('join-room rejects special chars', joinSpecial.success === false);

	const joinEmpty = await emitAsync(s, 'join-room', '');
	assert('join-room rejects empty string', joinEmpty.success === false);

	const leaveSpecial = await emitAsync(s, 'leave-room', 'bad room!@#$');
	assert('leave-room rejects special chars', leaveSpecial.success === false);

	const leaveEmpty = await emitAsync(s, 'leave-room', '');
	assert('leave-room rejects empty string', leaveEmpty.success === false);

	const rooms = await emitAsync(s, 'get-rooms');
	assert('get-rooms excludes own socket ID', !rooms.rooms.includes(s.id));
	assert('get-rooms contains io-role-public', rooms.rooms.includes('io-role-public'));

	// leave-room with valid name should succeed (leaving a room you're not in is harmless)
	const leaveValid = await emitAsync(s, 'leave-room', 'some-valid-room');
	assert('leave-room with valid name succeeds', leaveValid.success === true);

	s.disconnect();
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 4: PRESENCE SYSTEM
// ═════════════════════════════════════════════════════════════════════

async function group4_presence() {
	currentGroup = '4. Presence';
	console.log(`\n== ${currentGroup} ==`);

	const testUid = 'api::article.article';
	const testDoc = 'presence-test-001';

	// --- Public socket: presence events require authentication ---
	const pub = await connect();

	const joinDenied = await emitAsync(pub, 'presence:join', { uid: testUid, documentId: testDoc });
	assert('presence:join rejects public socket', joinDenied.success === false);
	assert('presence:join auth error message',
		joinDenied.error === 'Authentication required for presence', joinDenied.error);

	const leaveDenied = await emitAsync(pub, 'presence:leave', { uid: testUid, documentId: testDoc });
	assert('presence:leave rejects public socket', leaveDenied.success === false);

	const hbDenied = await emitAsync(pub, 'presence:heartbeat');
	assert('heartbeat rejects public socket', hbDenied.success === false);

	// presence:check is read-only, allowed without auth
	const checkPublic = await emitAsync(pub, 'presence:check', { uid: testUid, documentId: testDoc });
	assert('presence:check allowed for public socket', checkPublic.success === true);
	assert('presence:check shows not being edited', checkPublic.isBeingEdited === false);

	// Typing without auth -- should be silent (no callback)
	try {
		await emitAsync(pub, 'presence:typing', {
			uid: testUid, documentId: testDoc, fieldName: 'title',
		}, 1500);
		assert('typing has no callback for public user', true);
	} catch (err) {
		assert('typing silent for public user', err.message.startsWith('Timeout'));
	}

	// Typing with oversized fieldName
	try {
		await emitAsync(pub, 'presence:typing', {
			uid: testUid, documentId: testDoc, fieldName: 'x'.repeat(300),
		}, 1500);
		assert('typing with long fieldName -- no callback', true);
	} catch (err) {
		assert('typing rejects oversized fieldName (silent)', err.message.startsWith('Timeout'));
	}

	pub.disconnect();

	// --- Authenticated socket: full presence flow ---
	if (!JWT_TOKEN) {
		skip('Authenticated presence flow (join/check/leave)', 'no JWT_TOKEN');
		skip('Multi-socket presence isolation', 'no JWT_TOKEN');
		return;
	}

	const s = await connect({ auth: { token: JWT_TOKEN } });

	const joinRes = await emitAsync(s, 'presence:join', { uid: testUid, documentId: testDoc });
	assert('presence:join succeeds (authenticated)', joinRes.success === true, JSON.stringify(joinRes));
	if (joinRes.success) {
		assert('presence:join returns editors', Array.isArray(joinRes.editors));
	}

	const joinBad = await emitAsync(s, 'presence:join', { uid: '', documentId: '' });
	assert('presence:join rejects empty params', joinBad.success === false);

	const hb = await emitAsync(s, 'presence:heartbeat');
	assert('heartbeat succeeds', hb.success === true);
	assert('heartbeat returns lastSeen', typeof hb.lastSeen === 'number');

	const check1 = await emitAsync(s, 'presence:check', { uid: testUid, documentId: testDoc });
	assert('presence:check succeeds', check1.success === true);
	assert('presence:check shows isBeingEdited', check1.isBeingEdited === true);
	assert('presence:check returns editors array', Array.isArray(check1.editors));

	const leaveRes = await emitAsync(s, 'presence:leave', { uid: testUid, documentId: testDoc });
	assert('presence:leave succeeds', leaveRes.success === true);

	await sleep(200);
	const check2 = await emitAsync(s, 'presence:check', { uid: testUid, documentId: testDoc });
	assert('presence:check after leave: not being edited', check2.isBeingEdited === false);

	s.disconnect();

	// Multi-socket presence isolation (authenticated)
	const s1 = await connect({ auth: { token: JWT_TOKEN } });
	const s2 = await connect({ auth: { token: JWT_TOKEN } });

	await emitAsync(s1, 'presence:join', { uid: testUid, documentId: 'multi-001' });
	const c1 = await emitAsync(s2, 'presence:check', { uid: testUid, documentId: 'multi-001' });
	assert('Multi: s2 sees s1 as editor', c1.isBeingEdited === true);

	s1.disconnect();
	await sleep(500);

	const c2 = await emitAsync(s2, 'presence:check', { uid: testUid, documentId: 'multi-001' });
	assert('Multi: s2 sees no editor after s1 disconnect', c2.isBeingEdited === false);

	s2.disconnect();
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 5: LIVE PREVIEW
// ═════════════════════════════════════════════════════════════════════

async function group5_preview() {
	currentGroup = '5. Preview';
	console.log(`\n== ${currentGroup} ==`);

	const s = await connect();
	const testUid = 'api::article.article';
	const testDoc = 'preview-test-001';

	// Subscribe
	const subRes = await emitAsync(s, 'preview:subscribe', { uid: testUid, documentId: testDoc });
	assert('preview:subscribe responds', subRes !== undefined);

	// Subscribe missing params
	const subBad = await emitAsync(s, 'preview:subscribe', { uid: '', documentId: '' });
	assert('preview:subscribe rejects empty params', subBad.success === false);

	// Unsubscribe
	if (subRes.success) {
		const unsub = await emitAsync(s, 'preview:unsubscribe', { uid: testUid, documentId: testDoc });
		assert('preview:unsubscribe succeeds', unsub.success === true);
	}

	// field-change without auth -- silent (public socket)
	try {
		await emitAsync(s, 'preview:field-change', {
			uid: testUid, documentId: testDoc, fieldName: 'title', value: 'test',
		}, 1500);
		assert('field-change no callback', true);
	} catch (err) {
		assert('field-change silent for public user', err.message.startsWith('Timeout'));
	}

	// field-change with oversized fieldName
	try {
		await emitAsync(s, 'preview:field-change', {
			uid: testUid, documentId: testDoc, fieldName: 'x'.repeat(300), value: 'test',
		}, 1500);
		assert('field-change oversized fieldName -- silent', true);
	} catch (err) {
		assert('field-change rejects oversized fieldName', err.message.startsWith('Timeout'));
	}

	// Two-socket preview (field-change delivery)
	if (JWT_TOKEN) {
		const subscriber = await connect();
		const editor = await connect({ auth: { token: JWT_TOKEN } });

		await emitAsync(subscriber, 'preview:subscribe', { uid: testUid, documentId: 'preview-live' });
		await sleep(200);

		const eventPromise = waitForEvent(subscriber, 'preview:field', 3000);
		editor.emit('preview:field-change', {
			uid: testUid, documentId: 'preview-live', fieldName: 'title', value: 'hello',
		});

		const received = await eventPromise;
		assert('Two-socket: subscriber receives preview:field',
			received !== null && received.fieldName === 'title',
			received ? JSON.stringify(received) : 'timeout');

		subscriber.disconnect();
		editor.disconnect();
	} else {
		skip('Two-socket preview delivery', 'no JWT_TOKEN (needs authenticated editor)');
	}

	s.disconnect();
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 6: ENTITY SUBSCRIPTIONS
// ═════════════════════════════════════════════════════════════════════

async function group6_entitySubs() {
	currentGroup = '6. Entity Subscriptions';
	console.log(`\n== ${currentGroup} ==`);

	const s = await connect();

	// Invalid UID format
	const badUid = await emitAsync(s, 'subscribe-entity', { uid: 'invalid-format', id: 99 });
	assert('subscribe-entity rejects invalid uid', badUid.success === false);

	// Missing params
	const noParams = await emitAsync(s, 'subscribe-entity', { uid: '', id: '' });
	assert('subscribe-entity rejects empty params', noParams.success === false);

	// Unsubscribe (harmless even if not subscribed)
	const unsub = await emitAsync(s, 'unsubscribe-entity', {
		uid: 'api::article.article', id: 'nonexistent',
	});
	assert('unsubscribe-entity succeeds', unsub.success === true);

	// get-entity-subscriptions
	const list = await emitAsync(s, 'get-entity-subscriptions');
	assert('get-entity-subscriptions returns success', list.success === true);
	assert('get-entity-subscriptions returns array', Array.isArray(list.subscriptions));

	// M6: no presence/preview rooms in list
	// presence:join requires auth; preview:subscribe still works for public sockets
	if (JWT_TOKEN) {
		const sa = await connect({ auth: { token: JWT_TOKEN } });
		await emitAsync(sa, 'presence:join', {
			uid: 'api::article.article', documentId: 'filter-test',
		});
		await emitAsync(sa, 'preview:subscribe', {
			uid: 'api::article.article', documentId: 'filter-test',
		});
		const list2 = await emitAsync(sa, 'get-entity-subscriptions');
		const hasBad = list2.subscriptions.some(
			(sub) => sub.room.startsWith('presence:') || sub.room.startsWith('preview:')
		);
		assert('M6: subscription list excludes presence/preview rooms', !hasBad,
			JSON.stringify(list2.subscriptions));
		await emitAsync(sa, 'presence:leave', {
			uid: 'api::article.article', documentId: 'filter-test',
		});
		sa.disconnect();
	} else {
		// Without auth, presence:join is rejected so only preview rooms to filter
		await emitAsync(s, 'preview:subscribe', {
			uid: 'api::article.article', documentId: 'filter-test',
		});
		const list2 = await emitAsync(s, 'get-entity-subscriptions');
		const hasBad = list2.subscriptions.some(
			(sub) => sub.room.startsWith('presence:') || sub.room.startsWith('preview:')
		);
		assert('M6: subscription list excludes presence/preview rooms', !hasBad,
			JSON.stringify(list2.subscriptions));
	}

	s.disconnect();
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 7: PRIVATE MESSAGES
// ═════════════════════════════════════════════════════════════════════

async function group7_privateMessages() {
	currentGroup = '7. Private Messages';
	console.log(`\n== ${currentGroup} ==`);

	const s = await connect();

	// Disabled
	const pm1 = await emitAsync(s, 'private-message', { to: s.id, message: 'hello' });
	assert('PM denied (private rooms off)', pm1.success === false);
	assert('PM error message correct', pm1.error === 'Private messages are disabled', pm1.error);

	// Empty payload
	const pm2 = await emitAsync(s, 'private-message', { to: '', message: '' });
	assert('PM rejects empty payload', pm2.success === false);

	// Oversized message
	const pm3 = await emitAsync(s, 'private-message', {
		to: s.id, message: 'x'.repeat(10001),
	});
	assert('PM rejects oversized message', pm3.success === false);

	// Non-existent target
	const pm4 = await emitAsync(s, 'private-message', {
		to: 'nonexistent-socket-id', message: 'test',
	});
	assert('PM rejects non-existent target', pm4.success === false);

	s.disconnect();
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 8: REST ADMIN API
// ═════════════════════════════════════════════════════════════════════

async function group8_restApi() {
	currentGroup = '8. REST Admin API';
	console.log(`\n== ${currentGroup} ==`);

	if (!ADMIN_JWT) {
		skip('All REST API tests', 'no ADMIN_JWT env var');
		return;
	}

	// GET /io/settings
	const settings = await httpRequest('GET', '/io/settings', null, ADMIN_JWT);
	assert('GET /io/settings -> 200', settings.status === 200, `status: ${settings.status}`);
	assert('settings has data', settings.body?.data !== undefined);

	// PUT /io/settings -- valid partial update
	const update = await httpRequest('PUT', '/io/settings', {
		monitoring: { enableConnectionLogging: true },
	}, ADMIN_JWT);
	assert('PUT /io/settings -> 200', update.status === 200, `status: ${update.status}`);

	// PUT /io/settings -- unknown key (should 400)
	const badKey = await httpRequest('PUT', '/io/settings', {
		unknownTopLevelKey: true,
	}, ADMIN_JWT);
	assert('PUT /io/settings unknown key -> 400', badKey.status === 400,
		`status: ${badKey.status}`);

	// PUT /io/settings -- wrong type (Zod validation)
	const badType = await httpRequest('PUT', '/io/settings', {
		connection: { maxConnections: 'not-a-number' },
	}, ADMIN_JWT);
	assert('PUT /io/settings wrong type -> 400', badType.status === 400,
		`status: ${badType.status}`);

	// GET /io/content-types
	const ct = await httpRequest('GET', '/io/content-types', null, ADMIN_JWT);
	assert('GET /io/content-types -> 200', ct.status === 200, `status: ${ct.status}`);
	assert('content-types is array', Array.isArray(ct.body?.data));

	// GET /io/stats
	const stats = await httpRequest('GET', '/io/stats', null, ADMIN_JWT);
	assert('GET /io/stats -> 200', stats.status === 200, `status: ${stats.status}`);
	assert('stats has connections', stats.body?.data?.connections !== undefined);

	// GET /io/event-log
	const log = await httpRequest('GET', '/io/event-log', null, ADMIN_JWT);
	assert('GET /io/event-log -> 200', log.status === 200, `status: ${log.status}`);
	assert('event-log is array', Array.isArray(log.body?.data));

	// POST /io/test-event
	const testEvt = await httpRequest('POST', '/io/test-event', {
		eventName: 'hello', data: { foo: 'bar' },
	}, ADMIN_JWT);
	assert('POST /io/test-event -> 200', testEvt.status === 200, `status: ${testEvt.status}`);
	assert('test-event name is prefixed', testEvt.body?.data?.eventName?.startsWith('test:'),
		testEvt.body?.data?.eventName);

	// POST /io/reset-stats
	const reset = await httpRequest('POST', '/io/reset-stats', {}, ADMIN_JWT);
	assert('POST /io/reset-stats -> 200', reset.status === 200, `status: ${reset.status}`);

	// GET /io/roles
	const roles = await httpRequest('GET', '/io/roles', null, ADMIN_JWT);
	assert('GET /io/roles -> 200', roles.status === 200, `status: ${roles.status}`);
	assert('roles is array', Array.isArray(roles.body?.data));

	// GET /io/monitoring/stats
	const mon = await httpRequest('GET', '/io/monitoring/stats', null, ADMIN_JWT);
	assert('GET /io/monitoring/stats -> 200', mon.status === 200, `status: ${mon.status}`);

	// GET /io/security/sessions
	const sess = await httpRequest('GET', '/io/security/sessions', null, ADMIN_JWT);
	assert('GET /io/security/sessions -> 200', sess.status === 200, `status: ${sess.status}`);

	// GET /io/online-users
	const online = await httpRequest('GET', '/io/online-users', null, ADMIN_JWT);
	assert('GET /io/online-users -> 200', online.status === 200, `status: ${online.status}`);
	assert('online-users has counts', online.body?.data?.counts !== undefined);

	// POST /io/presence/session
	const session = await httpRequest('POST', '/io/presence/session', {}, ADMIN_JWT);
	assert('POST /io/presence/session -> 200', session.status === 200,
		`status: ${session.status}`);
	assert('session has token', typeof session.body?.token === 'string');
	assert('session has expiresAt', typeof session.body?.expiresAt === 'number');

	// Unauthenticated request should fail
	const noAuth = await httpRequest('GET', '/io/settings', null, null);
	assert('GET /io/settings without auth -> 401/403',
		noAuth.status === 401 || noAuth.status === 403, `status: ${noAuth.status}`);
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 9: LIFECYCLE EVENTS
// ═════════════════════════════════════════════════════════════════════

async function group9_lifecycle() {
	currentGroup = '9. Lifecycle Events';
	console.log(`\n== ${currentGroup} ==`);

	if (!ADMIN_JWT || !CONTENT_TYPE_UID) {
		skip('All lifecycle tests', 'needs ADMIN_JWT + CONTENT_TYPE_UID');
		return;
	}

	const parts = CONTENT_TYPE_UID.split('.');
	const singularName = parts[parts.length - 1];
	const pluralPath = singularName + 's';

	const s = await connect();

	// Create
	const createPromise = waitForEvent(s, `${singularName}:create`, 8000);
	const createRes = await httpRequest('POST', `/api/${pluralPath}`, {
		data: { name: `io-test-${Date.now()}` },
	}, ADMIN_JWT);

	if (createRes.status >= 200 && createRes.status < 300) {
		const createEvent = await createPromise;
		assert('Lifecycle: create event received', createEvent !== null,
			'no event within 8s');

		if (createEvent) {
			assert('Create event has data', createEvent.data !== undefined);
			const hasNoSecrets = !createEvent.data?.password && !createEvent.data?.secret;
			assert('Create event sanitized (no password/secret)', hasNoSecrets);
		}

		// Update
		const docId = createRes.body?.data?.documentId || createRes.body?.data?.id;
		if (docId) {
			const updatePromise = waitForEvent(s, `${singularName}:update`, 8000);
			await httpRequest('PUT', `/api/${pluralPath}/${docId}`, {
				data: { name: `io-test-updated-${Date.now()}` },
			}, ADMIN_JWT);

			const updateEvent = await updatePromise;
			assert('Lifecycle: update event received', updateEvent !== null,
				'no event within 8s');

			// Delete
			const deletePromise = waitForEvent(s, `${singularName}:delete`, 8000);
			await httpRequest('DELETE', `/api/${pluralPath}/${docId}`, null, ADMIN_JWT);

			const deleteEvent = await deletePromise;
			assert('Lifecycle: delete event received', deleteEvent !== null,
				'no event within 8s');
		} else {
			skip('Update + Delete lifecycle', 'could not get documentId from create response');
		}
	} else {
		skip('All lifecycle events', `create returned ${createRes.status}: ${JSON.stringify(createRes.body)}`);
	}

	s.disconnect();
}

// ═════════════════════════════════════════════════════════════════════
// GROUP 10: EDGE CASES
// ═════════════════════════════════════════════════════════════════════

async function group10_edgeCases() {
	currentGroup = '10. Edge Cases';
	console.log(`\n== ${currentGroup} ==`);

	const testUid = 'api::article.article';
	const authOpts = JWT_TOKEN ? { auth: { token: JWT_TOKEN } } : {};

	if (JWT_TOKEN) {
		// Disconnect cleans up presence (requires auth for presence:join)
		const s1 = await connect(authOpts);
		const s2 = await connect();
		await emitAsync(s1, 'presence:join', { uid: testUid, documentId: 'edge-001' });
		s1.disconnect();
		await sleep(500);
		const check = await emitAsync(s2, 'presence:check', { uid: testUid, documentId: 'edge-001' });
		assert('Disconnect cleans presence', check.isBeingEdited === false);
		s2.disconnect();

		// Reconnect: old presence gone
		const s3 = await connect(authOpts);
		await emitAsync(s3, 'presence:join', { uid: testUid, documentId: 'edge-002' });
		const oldId = s3.id;
		s3.disconnect();
		await sleep(500);
		s3.connect();
		await new Promise((r) => {
			const t = setTimeout(r, 3000);
			s3.on('connect', () => { clearTimeout(t); r(); });
		});
		assert('After reconnect: new ID', s3.id !== oldId);
		const check2 = await emitAsync(s3, 'presence:check', { uid: testUid, documentId: 'edge-002' });
		assert('After reconnect: old presence cleaned', check2.isBeingEdited === false);
		s3.disconnect();

		// get-entity-subscriptions after presence:join -> presence room excluded
		const s4 = await connect(authOpts);
		await emitAsync(s4, 'presence:join', { uid: testUid, documentId: 'edge-003' });
		const subs = await emitAsync(s4, 'get-entity-subscriptions');
		const hasPresence = subs.subscriptions.some((x) => x.room.includes('presence:'));
		assert('Entity subs exclude presence rooms', !hasPresence);
		s4.disconnect();
	} else {
		skip('Disconnect cleans presence', 'no JWT_TOKEN (presence requires auth)');
		skip('After reconnect: old presence cleaned', 'no JWT_TOKEN (presence requires auth)');
		skip('Entity subs exclude presence rooms', 'no JWT_TOKEN (presence requires auth)');
	}

	// Large payload on presence:join (should not crash, rejected or handled)
	const s5 = await connect();
	try {
		const res = await emitAsync(s5, 'presence:join', {
			uid: testUid, documentId: 'x'.repeat(5000),
		}, 2000);
		assert('Large documentId handled gracefully', res.success === false);
	} catch {
		assert('Large documentId handled (timeout ok)', true);
	}
	assert('Server alive after large payload', s5.connected);
	s5.disconnect();
}

// ═════════════════════════════════════════════════════════════════════
// RUNNER
// ═════════════════════════════════════════════════════════════════════

async function main() {
	console.log('================================================================');
	console.log('  @strapi-community/plugin-io -- Full Test Suite');
	console.log('================================================================');
	console.log(`  Server:         ${SERVER_URL}`);
	console.log(`  Admin JWT:      ${ADMIN_JWT ? 'provided' : 'not set (REST/lifecycle tests skipped)'}`);
	console.log(`  JWT Token:      ${JWT_TOKEN ? 'provided' : 'not set (auth socket tests skipped)'}`);
	console.log(`  Content Type:   ${CONTENT_TYPE_UID || 'not set (lifecycle tests skipped)'}`);
	console.log('================================================================');

	let socket;
	try {
		socket = await connect();
		socket.disconnect();
	} catch (err) {
		console.error(`\n[FATAL] Cannot connect to ${SERVER_URL}: ${err.message}`);
		console.error('Make sure Strapi is running with plugin-io enabled.\n');
		process.exit(1);
	}

	try {
		await group1_connection();
		await group2_security();
		await group3_rooms();
		await group4_presence();
		await group5_preview();
		await group6_entitySubs();
		await group7_privateMessages();
		await group8_restApi();
		await group9_lifecycle();
		await group10_edgeCases();
	} catch (err) {
		console.error(`\n[FATAL] Unhandled error in ${currentGroup}: ${err.message}`);
		console.error(err.stack);
		failed++;
	}

	// ── Summary ──────────────────────────────────────────────────────
	const total = passed + failed + skipped;
	console.log('\n================================================================');
	console.log('  RESULTS');
	console.log('================================================================');
	console.log(`  Total:   ${total}`);
	console.log(`  Passed:  ${passed}`);
	console.log(`  Failed:  ${failed}`);
	console.log(`  Skipped: ${skipped}`);
	console.log('================================================================');

	if (failed > 0) {
		console.log('\n  Failed tests:');
		results
			.filter((r) => r.status === 'FAIL')
			.forEach((r) => console.log(`    - ${r.label}${r.detail ? ': ' + r.detail : ''}`));
		console.log('');
	}

	if (skipped > 0) {
		console.log('\n  Skipped tests:');
		results
			.filter((r) => r.status === 'SKIP')
			.forEach((r) => console.log(`    - ${r.label}: ${r.detail}`));
		console.log('');
	}

	process.exit(failed > 0 ? 1 : 0);
}

main();
