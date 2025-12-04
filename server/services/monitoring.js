'use strict';

const { pluginId } = require('../utils/pluginId');

/**
 * Monitoring service for Socket.IO
 * Tracks connections, events, and provides statistics
 */
module.exports = ({ strapi }) => {
	// In-memory storage for event logs
	let eventLog = [];
	let eventStats = {
		totalEvents: 0,
		eventsByType: {},
		lastReset: Date.now(),
	};

	return {
		/**
		 * Get current connection statistics
		 */
		getConnectionStats() {
			const io = strapi.$io?.server;
			if (!io) {
				return {
					connected: 0,
					rooms: [],
					sockets: [],
					entitySubscriptions: {
						total: 0,
						byContentType: {},
					},
				};
			}

			const sockets = Array.from(io.sockets.sockets.values());
			const rooms = Array.from(io.sockets.adapter.rooms.keys())
				.filter((room) => !io.sockets.sockets.has(room)); // Filter out socket IDs

			// Calculate entity subscription metrics
			const entityRooms = rooms.filter(room => room.includes(':') && room.match(/^(api|plugin)::/));
			const entitySubsByType = {};
			entityRooms.forEach(room => {
				const uid = room.substring(0, room.lastIndexOf(':'));
				entitySubsByType[uid] = (entitySubsByType[uid] || 0) + 1;
			});

			return {
				connected: sockets.length,
				rooms: rooms.map((room) => ({
					name: room,
					members: io.sockets.adapter.rooms.get(room)?.size || 0,
					isEntityRoom: room.includes(':') && room.match(/^(api|plugin)::/) !== null,
				})),
				sockets: sockets.map((socket) => ({
					id: socket.id,
					connected: socket.connected,
					rooms: Array.from(socket.rooms).filter((r) => r !== socket.id),
					entitySubscriptions: Array.from(socket.rooms)
						.filter((r) => r !== socket.id && r.includes(':') && r.match(/^(api|plugin)::/))
						.map(room => {
							const lastColon = room.lastIndexOf(':');
							return {
								uid: room.substring(0, lastColon),
								id: room.substring(lastColon + 1),
								room: room,
							};
						}),
					handshake: {
						address: socket.handshake.address,
						time: socket.handshake.time,
						query: socket.handshake.query,
					},
					// Include user info if authenticated
					user: socket.user || null,
				})),
				entitySubscriptions: {
					total: entityRooms.length,
					byContentType: entitySubsByType,
					rooms: entityRooms,
				},
			};
		},

		/**
		 * Get event statistics
		 */
		getEventStats() {
			return {
				...eventStats,
				eventsPerSecond: this.getEventsPerSecond(),
			};
		},

		/**
		 * Get recent event log
		 */
		getEventLog(limit = 50) {
			return eventLog.slice(-limit);
		},

		/**
		 * Log an event
		 */
		logEvent(eventType, data = {}) {
			const settings = strapi.$ioSettings || {};
			if (!settings.monitoring?.enableEventLogging) return;

			const entry = {
				timestamp: Date.now(),
				type: eventType,
				data,
			};

			eventLog.push(entry);

			// Update stats
			eventStats.totalEvents++;
			eventStats.eventsByType[eventType] = (eventStats.eventsByType[eventType] || 0) + 1;

			// Trim log if too large
			const maxSize = settings.monitoring?.maxEventLogSize || 100;
			if (eventLog.length > maxSize) {
				eventLog = eventLog.slice(-maxSize);
			}
		},

		/**
		 * Calculate events per second
		 */
		getEventsPerSecond() {
			const now = Date.now();
			const elapsed = (now - eventStats.lastReset) / 1000;
			return elapsed > 0 ? (eventStats.totalEvents / elapsed).toFixed(2) : 0;
		},

		/**
		 * Reset statistics
		 */
		resetStats() {
			eventLog = [];
			eventStats = {
				totalEvents: 0,
				eventsByType: {},
				lastReset: Date.now(),
			};
		},

		/**
		 * Send test event
		 */
		sendTestEvent(eventName = 'test', data = {}) {
			const io = strapi.$io?.server;
			if (!io) {
				throw new Error('Socket.IO not initialized');
			}

			const testData = {
				...data,
				timestamp: Date.now(),
				test: true,
			};

			io.emit(eventName, testData);
			this.logEvent('test', { eventName, data: testData });

			return {
				success: true,
				eventName,
				data: testData,
				recipients: io.sockets.sockets.size,
			};
		},
	};
};
