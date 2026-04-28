import { SocketIO } from '../structures/index.js';
import { pluginId } from '../utils/pluginId.js';
import sanitizeSensitiveFields from '../middlewares/sanitize-sensitive-fields.js';

const MAX_EDITING_ROOMS_PER_SOCKET = 50;
const MAX_STRING_LEN = 256;

/**
 * Normalizes and validates presence event input. Returns a safe record or
 * null when the payload is invalid.
 *
 * @param {*} data
 * @returns {{uid: string, documentId: string, contentTypeName: string, entryTitle: string, fieldName: string}|null}
 */
function normalizePresencePayload(data) {
  if (!data || typeof data !== 'object') return null;
  const uid = typeof data.uid === 'string' ? data.uid.slice(0, MAX_STRING_LEN) : '';
  const documentId = typeof data.documentId === 'string' ? data.documentId.slice(0, MAX_STRING_LEN) : '';
  if (!uid || !documentId) return null;

  if (!/^[a-zA-Z0-9:._-]+$/.test(uid)) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(documentId)) return null;

  return {
    uid,
    documentId,
    contentTypeName: typeof data.contentTypeName === 'string'
      ? data.contentTypeName.slice(0, MAX_STRING_LEN)
      : '',
    entryTitle: typeof data.entryTitle === 'string'
      ? data.entryTitle.slice(0, MAX_STRING_LEN)
      : '',
    fieldName: typeof data.fieldName === 'string'
      ? data.fieldName.slice(0, MAX_STRING_LEN)
      : '',
  };
}

/**
 * Bootstrap IO instance and related "services"
 *
 * @param {*} params
 * @param {*} params.strapi
 */
async function bootstrapIO({ strapi }) {
	const settings = strapi.config.get(`plugin::${pluginId}`);

	const io = new SocketIO(settings.socket.serverOptions);

	strapi.$io = io;

	sanitizeSensitiveFields({ strapi });

	const presenceMap = new Map();

	strapi.$io.server.on('connection', (socket) => {
		socket.on('presence:join', (data, callback) => {
			const payload = normalizePresencePayload(data);
			if (!payload) return;

			socket.data.editing = socket.data.editing || [];
			if (socket.data.editing.length >= MAX_EDITING_ROOMS_PER_SOCKET) {
				if (typeof callback === 'function') {
					callback({ success: false, error: 'Too many editing sessions for this socket.' });
				}
				return;
			}

			const room = `presence:${payload.uid}:${payload.documentId}`;
			if (socket.data.editing.some((e) => e.room === room)) {
				const editors = getEditorsInRoom(strapi.$io.server, room, presenceMap);
				if (typeof callback === 'function') {
					callback({ success: true, editors });
				}
				return;
			}

			socket.join(room);
			socket.data.editing.push({
				uid: payload.uid,
				documentId: payload.documentId,
				contentTypeName: payload.contentTypeName,
				entryTitle: payload.entryTitle,
				room,
			});

			const editors = getEditorsInRoom(strapi.$io.server, room, presenceMap);
			strapi.$io.server.to(room).emit('presence:update', {
				uid: payload.uid,
				documentId: payload.documentId,
				editors,
			});

			if (typeof callback === 'function') {
				callback({ success: true, editors });
			}
		});

		socket.on('presence:leave', (data) => {
			const payload = normalizePresencePayload(data);
			if (!payload) return;

			const room = `presence:${payload.uid}:${payload.documentId}`;
			socket.leave(room);
			socket.data.editing = (socket.data.editing || []).filter(
				(e) => e.room !== room
			);

			const editors = getEditorsInRoom(strapi.$io.server, room, presenceMap);
			strapi.$io.server.to(room).emit('presence:update', {
				uid: payload.uid,
				documentId: payload.documentId,
				editors,
			});
		});

		socket.on('presence:typing', (data) => {
			const payload = normalizePresencePayload(data);
			if (!payload) return;

			const room = `presence:${payload.uid}:${payload.documentId}`;
			const isMemberOfRoom = (socket.data.editing || []).some((e) => e.room === room);
			if (!isMemberOfRoom) return;

			socket.to(room).emit('presence:typing', {
				uid: payload.uid,
				documentId: payload.documentId,
				user: socket.data.user || {},
				fieldName: payload.fieldName,
			});
		});

		// Presence: heartbeat
		socket.on('presence:heartbeat', () => {
			presenceMap.set(socket.id, Date.now());
		});

		// Clean up on disconnect
		socket.on('disconnect', () => {
			presenceMap.delete(socket.id);
			const rooms = socket.data.editing || [];
			for (const entry of rooms) {
				const editors = getEditorsInRoom(strapi.$io.server, entry.room, presenceMap);
				strapi.$io.server.to(entry.room).emit('presence:update', {
					uid: entry.uid,
					documentId: entry.documentId,
					editors,
				});
			}
		});

		// User-defined events from plugin config
		if (settings.events?.length) {
			for (const event of settings.events) {
				if (event.name === 'connection') {
					event.handler({ strapi, io }, socket);
				} else {
					socket.on(event.name, (...args) => event.handler({ strapi, io }, socket, ...args));
				}
			}
		}
	});
}

/**
 * Gets list of editors in a presence room with their user data.
 * @param {import('socket.io').Server} server
 * @param {string} room
 * @param {Map} presenceMap
 * @returns {Array}
 */
function getEditorsInRoom(server, room, presenceMap) {
	const roomSockets = server.sockets.adapter.rooms?.get(room);
	if (!roomSockets) return [];

	const editors = [];
	for (const socketId of roomSockets) {
		const socket = server.sockets.sockets.get(socketId);
		if (!socket) continue;

		const editingEntry = (socket.data.editing || []).find((e) => e.room === room);
		editors.push({
			socketId: socket.id,
			user: socket.data.user || {},
			contentTypeName: editingEntry?.contentTypeName || '',
			entryTitle: editingEntry?.entryTitle || '',
			lastSeen: presenceMap.get(socketId) || Date.now(),
		});
	}

	return editors;
}

export { bootstrapIO };
