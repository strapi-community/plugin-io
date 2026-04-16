import { SocketIO } from '../structures/index.js';
import { pluginId } from '../utils/pluginId.js';
import sanitizeSensitiveFields from '../middlewares/sanitize-sensitive-fields.js';

/**
 * Bootstrap IO instance and related "services"
 *
 * @param {*} params
 * @param {*} params.strapi
 */
async function bootstrapIO({ strapi }) {
	const settings = strapi.config.get(`plugin::${pluginId}`);

	// initialize io
	const io = new SocketIO(settings.socket.serverOptions);

	// make io avaiable anywhere strapi global object is
	strapi.$io = io;

	// Apply sensitive fields sanitization middleware
	sanitizeSensitiveFields({ strapi });

	// Presence tracking per document
	const presenceMap = new Map();

	strapi.$io.server.on('connection', (socket) => {
		// Presence: join a document editing session
		socket.on('presence:join', (data, callback) => {
			if (!data?.uid || !data?.documentId) return;

			const room = `presence:${data.uid}:${data.documentId}`;
			socket.join(room);

			socket.data.editing = socket.data.editing || [];
			socket.data.editing.push({
				uid: data.uid,
				documentId: data.documentId,
				contentTypeName: data.contentTypeName || '',
				entryTitle: data.entryTitle || '',
				room,
			});

			const editors = getEditorsInRoom(strapi.$io.server, room, presenceMap);
			strapi.$io.server.to(room).emit('presence:update', {
				uid: data.uid,
				documentId: data.documentId,
				editors,
			});

			if (typeof callback === 'function') {
				callback({ success: true, editors });
			}
		});

		// Presence: leave a document editing session
		socket.on('presence:leave', (data) => {
			if (!data?.uid || !data?.documentId) return;

			const room = `presence:${data.uid}:${data.documentId}`;
			socket.leave(room);
			socket.data.editing = (socket.data.editing || []).filter(
				(e) => e.room !== room
			);

			const editors = getEditorsInRoom(strapi.$io.server, room, presenceMap);
			strapi.$io.server.to(room).emit('presence:update', {
				uid: data.uid,
				documentId: data.documentId,
				editors,
			});
		});

		// Presence: typing indicator
		socket.on('presence:typing', (data) => {
			if (!data?.uid || !data?.documentId) return;

			const room = `presence:${data.uid}:${data.documentId}`;
			socket.to(room).emit('presence:typing', {
				uid: data.uid,
				documentId: data.documentId,
				user: socket.data.user || {},
				fieldName: data.fieldName || '',
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
