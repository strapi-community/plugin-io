import { createTokenBucket } from '../services/rate-limit.js';

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

/**
 * Lists the admins in a presence room, one entry per admin.
 *
 * @param {import('socket.io').Server} io - Socket.IO server.
 * @param {string} room - Presence room.
 * @param {Map<string, number>} lastSeen - Heartbeats by socket id.
 * @returns {Array<{ id: number, firstname: string | null, lastname: string | null, lastSeen: number }>} Editors.
 */
function getEditors(io, room, lastSeen) {
	const ids = io.of('/').adapter.rooms?.get(room);
	if (!ids) return [];
	const editors = new Map();
	for (const socketId of ids) {
		const socket = io.of('/').sockets.get(socketId);
		const user = socket?.data?.admin;
		if (!user?.id || socket.data.kind !== 'admin') continue;
		const seen = lastSeen.get(socketId) || Date.now();
		const existing = editors.get(user.id);
		if (!existing || existing.lastSeen < seen) editors.set(user.id, { ...toEditor(user), lastSeen: seen });
	}
	return [...editors.values()];
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
 * @param {Map<string, number>} deps.lastSeen - Heartbeat map.
 */
function registerPresence({ strapi, io, socket, lastSeen }) {
	if (socket.data.kind !== 'admin') return;
	const settings = () => strapi.plugin('io').service('settings').current().presence;
	const allow = createTokenBucket(() => PRESENCE_EVENTS_PER_SECOND);
	const reply = (callback, payload) => typeof callback === 'function' && callback(payload);
	const broadcast = (uid, documentId, room) =>
		io.to(room).emit('presence:update', { uid, documentId, editors: getEditors(io, room, lastSeen) });

	socket.data.editing = [];

	socket.on('presence:join', (data, callback) => {
		if (!settings().enabled || !allow()) return reply(callback, { success: false });
		const payload = parsePresencePayload(data);
		if (!payload || !strapi.contentTypes[payload.uid]) return reply(callback, { success: false });
		const ability = socket.data.adminAbility;
		if (!ability?.can?.('plugin::content-manager.explorer.read', payload.uid)) {
			return reply(callback, { success: false });
		}
		const room = `presence:${payload.uid}:${payload.documentId}`;
		if (!socket.data.editing.some((entry) => entry.room === room)) {
			if (socket.data.editing.length >= MAX_ROOMS_PER_SOCKET) return reply(callback, { success: false });
			socket.join(room);
			socket.data.editing.push({ uid: payload.uid, documentId: payload.documentId, room });
			broadcast(payload.uid, payload.documentId, room);
		}
		return reply(callback, { success: true, editors: getEditors(io, room, lastSeen) });
	});

	socket.on('presence:leave', (data) => {
		if (!allow()) return;
		const payload = parsePresencePayload(data);
		if (!payload) return;
		const room = `presence:${payload.uid}:${payload.documentId}`;
		if (!socket.data.editing.some((entry) => entry.room === room)) return;
		socket.leave(room);
		socket.data.editing = socket.data.editing.filter((entry) => entry.room !== room);
		broadcast(payload.uid, payload.documentId, room);
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
		if (allow()) lastSeen.set(socket.id, Date.now());
	});

	socket.on('disconnect', () => {
		lastSeen.delete(socket.id);
		for (const entry of socket.data.editing || []) broadcast(entry.uid, entry.documentId, entry.room);
	});
}

export { getEditors, parsePresencePayload, registerPresence };
