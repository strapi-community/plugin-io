import { createTokenBucket } from '../services/rate-limit.js';
import { getPrivate } from '../utils/socket-private.js';

const MAX_ROOMS_PER_SOCKET = 50;
const UID_RE = /^[a-zA-Z0-9:._-]{1,200}$/;
const DOCUMENT_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const FIELD_RE = /^[a-zA-Z0-9_.[\]-]{1,100}$/;
const PRESENCE_EVENTS_PER_SECOND = 10;

/**
 * Validates a presence payload. Only `uid`, `documentId` and an optional
 * `fieldName` are read from the client; display data is built on the server.
 *
 * @param {unknown} data - Client payload.
 * @returns {{ uid: string, documentId: string, fieldName: string } | null} Payload or null.
 */
function parsePresencePayload(data) {
	if (!data || typeof data !== 'object') return null;
	const { uid, documentId, fieldName } = data;
	if (typeof uid !== 'string' || !UID_RE.test(uid)) return null;
	if (typeof documentId !== 'string' || !DOCUMENT_ID_RE.test(documentId)) return null;
	return {
		uid,
		documentId,
		fieldName: typeof fieldName === 'string' && FIELD_RE.test(fieldName) ? fieldName : '',
	};
}

/**
 * Returns the public display fields of an admin (no email).
 *
 * @param {{ id: number, firstname?: string | null, lastname?: string | null }} user - Admin user.
 * @returns {{ id: number, firstname: string | null, lastname: string | null }} Display data.
 */
const toEditor = (user) => ({ id: user.id, firstname: user.firstname ?? null, lastname: user.lastname ?? null });

/** Presence updates for one room are coalesced for this long. */
const BROADCAST_DELAY_MS = 100;

/**
 * Lists the admins in a presence room, one entry per admin, across every
 * Socket.IO server: `fetchSockets()` asks the other servers through the
 * adapter and returns their sockets' `id`, `rooms` and `data`
 * (https://socket.io/docs/v4/server-instance/#fetchsockets). Without a
 * multi-server adapter it lists this process only.
 *
 * @param {import('socket.io').Server} io - Socket.IO server.
 * @param {string} room - Presence room.
 * @returns {Promise<Array<{ id: number, firstname: string | null, lastname: string | null, lastSeen: number }>>} Editors.
 */
async function getEditors(io, room) {
	let sockets;
	try {
		sockets = await io.in(room).fetchSockets();
	} catch {
		// A server did not answer in time; fall back to this process.
		sockets = await io.local.in(room).fetchSockets();
	}
	const editors = new Map();
	for (const socket of sockets) {
		const user = socket?.data?.admin;
		if (!user?.id || socket.data.kind !== 'admin') continue;
		const seen = Number(socket.data.lastSeen) || Date.now();
		const existing = editors.get(user.id);
		if (!existing || existing.lastSeen < seen) editors.set(user.id, { ...toEditor(user), lastSeen: seen });
	}
	return [...editors.values()];
}

/** @type {WeakMap<object, Map<string, NodeJS.Timeout>>} Pending broadcasts per server and room. */
const pendingBroadcasts = new WeakMap();

/**
 * Sends the room's editor list to the room after a short delay, once for
 * all joins and leaves in that time (each list is a cross-server request).
 *
 * @param {import('socket.io').Server} io - Socket.IO server.
 * @param {string} uid - Content type uid.
 * @param {string} documentId - Document id.
 * @param {string} room - Presence room.
 */
function scheduleBroadcast(io, uid, documentId, room) {
	let pending = pendingBroadcasts.get(io);
	if (!pending) {
		pending = new Map();
		pendingBroadcasts.set(io, pending);
	}
	if (pending.has(room)) return;
	const timer = setTimeout(() => {
		pending.delete(room);
		getEditors(io, room)
			.then((editors) => io.to(room).emit('presence:update', { uid, documentId, editors }))
			.catch(() => {});
	}, BROADCAST_DELAY_MS);
	timer.unref?.();
	pending.set(room, timer);
}

/**
 * Registers presence handlers on an admin socket. Non-admin sockets and
 * disabled presence are ignored silently. Joining requires Content Manager
 * read permission for the content type.
 *
 * @param {object} deps - Dependencies.
 * @param {import('@strapi/types').Core.Strapi} deps.strapi - Strapi instance.
 * @param {import('socket.io').Server} deps.io - Socket.IO server.
 * @param {import('socket.io').Socket} deps.socket - Connected socket.
 */
function registerPresence({ strapi, io, socket }) {
	if (socket.data.kind !== 'admin') return;
	const settings = () => strapi.plugin('io').service('settings').current().presence;
	const allow = createTokenBucket(() => PRESENCE_EVENTS_PER_SECOND);
	const reply = (callback, payload) => typeof callback === 'function' && callback(payload);

	socket.data.editing = [];
	socket.data.lastSeen = Date.now();

	socket.on('presence:join', async (data, callback) => {
		if (!settings().enabled || !allow()) return reply(callback, { success: false });
		const payload = parsePresencePayload(data);
		if (!payload || !strapi.contentTypes[payload.uid]) return reply(callback, { success: false });
		const ability = getPrivate(socket, 'adminAbility');
		if (!ability?.can?.('plugin::content-manager.explorer.read', payload.uid)) {
			return reply(callback, { success: false });
		}
		const room = `presence:${payload.uid}:${payload.documentId}`;
		if (!socket.data.editing.some((entry) => entry.room === room)) {
			if (socket.data.editing.length >= MAX_ROOMS_PER_SOCKET) return reply(callback, { success: false });
			socket.join(room);
			socket.data.editing.push({ uid: payload.uid, documentId: payload.documentId, room });
			scheduleBroadcast(io, payload.uid, payload.documentId, room);
		}
		let editors = [];
		try {
			editors = await getEditors(io, room);
		} catch {}
		return reply(callback, { success: true, editors });
	});

	socket.on('presence:leave', (data) => {
		if (!allow()) return;
		const payload = parsePresencePayload(data);
		if (!payload) return;
		const room = `presence:${payload.uid}:${payload.documentId}`;
		if (!socket.data.editing.some((entry) => entry.room === room)) return;
		socket.leave(room);
		socket.data.editing = socket.data.editing.filter((entry) => entry.room !== room);
		scheduleBroadcast(io, payload.uid, payload.documentId, room);
	});

	socket.on('presence:typing', (data) => {
		if (!settings().enabled || !settings().showTypingIndicator || !allow()) return;
		const payload = parsePresencePayload(data);
		if (!payload) return;
		const room = `presence:${payload.uid}:${payload.documentId}`;
		if (!socket.data.editing.some((entry) => entry.room === room)) return;
		socket.to(room).emit('presence:typing', {
			uid: payload.uid,
			documentId: payload.documentId,
			user: toEditor(socket.data.admin),
			fieldName: payload.fieldName,
		});
	});

	socket.on('presence:heartbeat', () => {
		if (allow()) socket.data.lastSeen = Date.now();
	});

	socket.on('disconnect', () => {
		for (const entry of socket.data.editing || []) scheduleBroadcast(io, entry.uid, entry.documentId, entry.room);
	});
}

export { getEditors, parsePresencePayload, registerPresence };
