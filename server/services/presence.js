'use strict';

const { pluginId } = require('../utils/pluginId');

/**
 * Presence Service for Socket.IO
 * Tracks which users are online and which entities they are editing.
 * Enables real-time collaboration awareness like Payload CMS and Sanity.
 */
module.exports = ({ strapi }) => {
	// In-memory presence stores
	// Map: socketId -> { user, entities: Set<"uid:documentId">, lastSeen, connectedAt }
	const activeConnections = new Map();
	
	// Map: "uid:documentId" -> Set<socketId>
	const entityEditors = new Map();
	
	// Cleanup interval reference
	let cleanupInterval = null;

	/**
	 * Gets the entity room key from uid and documentId
	 * @param {string} uid - Content type UID
	 * @param {string} documentId - Document ID
	 * @returns {string} Room key
	 */
	const getEntityKey = (uid, documentId) => `${uid}:${documentId}`;

	/**
	 * Gets presence settings from plugin settings
	 * @returns {object} Presence settings
	 */
	const getPresenceSettings = () => {
		const settings = strapi.$ioSettings || {};
		return {
			enabled: settings.presence?.enabled ?? true,
			heartbeatInterval: settings.presence?.heartbeatInterval ?? 30000,
			staleTimeout: settings.presence?.staleTimeout ?? 60000,
			showAvatars: settings.presence?.showAvatars ?? true,
		};
	};

	/**
	 * Broadcasts presence update to all editors of an entity
	 * @param {string} uid - Content type UID
	 * @param {string} documentId - Document ID
	 */
	const broadcastPresenceUpdate = async (uid, documentId) => {
		const io = strapi.$io?.server;
		if (!io) return;

		const entityKey = getEntityKey(uid, documentId);
		const editorSocketIds = entityEditors.get(entityKey) || new Set();
		
		// Build editors list with user info
		const editors = [];
		for (const socketId of editorSocketIds) {
			const connection = activeConnections.get(socketId);
			if (connection?.user) {
				editors.push({
					socketId,
					user: {
						id: connection.user.id,
						username: connection.user.username,
						email: connection.user.email,
						firstname: connection.user.firstname,
						lastname: connection.user.lastname,
					},
					joinedAt: connection.entities?.get(entityKey) || Date.now(),
				});
			}
		}

		// Emit to entity room
		const roomName = `presence:${entityKey}`;
		io.to(roomName).emit('presence:update', {
			uid,
			documentId,
			editors,
			count: editors.length,
			timestamp: Date.now(),
		});

		strapi.log.debug(`socket.io: Presence update for ${entityKey} - ${editors.length} editor(s)`);
	};

	return {
		/**
		 * Registers a new socket connection for presence tracking
		 * @param {string} socketId - Socket ID
		 * @param {object} user - User object (can be null for anonymous)
		 */
		registerConnection(socketId, user = null) {
			const settings = getPresenceSettings();
			if (!settings.enabled) return;

			activeConnections.set(socketId, {
				user,
				entities: new Map(), // entityKey -> joinedAt timestamp
				lastSeen: Date.now(),
				connectedAt: Date.now(),
			});

			strapi.log.debug(`socket.io: Presence registered for socket ${socketId}`);
		},

		/**
		 * Unregisters a socket connection and cleans up all entity presence
		 * @param {string} socketId - Socket ID
		 */
		async unregisterConnection(socketId) {
			const connection = activeConnections.get(socketId);
			if (!connection) return;

			// Leave all entities this socket was editing
			if (connection.entities) {
				for (const entityKey of connection.entities.keys()) {
					const [uid, documentId] = entityKey.split(':');
					await this.leaveEntity(socketId, uid, documentId, false);
				}
			}

			activeConnections.delete(socketId);
			strapi.log.debug(`socket.io: Presence unregistered for socket ${socketId}`);
		},

		/**
		 * User joins an entity for editing
		 * @param {string} socketId - Socket ID
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @returns {object} Join result with current editors
		 */
		async joinEntity(socketId, uid, documentId) {
			const settings = getPresenceSettings();
			if (!settings.enabled) {
				return { success: false, error: 'Presence is disabled' };
			}

			const connection = activeConnections.get(socketId);
			if (!connection) {
				return { success: false, error: 'Socket not registered for presence' };
			}

			const entityKey = getEntityKey(uid, documentId);
			
			// Add to entity editors
			if (!entityEditors.has(entityKey)) {
				entityEditors.set(entityKey, new Set());
			}
			entityEditors.get(entityKey).add(socketId);

			// Track in connection's entities
			connection.entities.set(entityKey, Date.now());
			connection.lastSeen = Date.now();

			// Join the presence room for this entity
			const io = strapi.$io?.server;
			const socket = io?.sockets.sockets.get(socketId);
			if (socket) {
				socket.join(`presence:${entityKey}`);
			}

			// Broadcast update to all editors
			await broadcastPresenceUpdate(uid, documentId);

			strapi.log.info(`socket.io: User ${connection.user?.username || 'anonymous'} joined entity ${entityKey}`);

			return {
				success: true,
				entityKey,
				editors: await this.getEntityEditors(uid, documentId),
			};
		},

		/**
		 * User leaves an entity
		 * @param {string} socketId - Socket ID
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @param {boolean} broadcast - Whether to broadcast update (default: true)
		 * @returns {object} Leave result
		 */
		async leaveEntity(socketId, uid, documentId, broadcast = true) {
			const settings = getPresenceSettings();
			if (!settings.enabled) {
				return { success: false, error: 'Presence is disabled' };
			}

			const entityKey = getEntityKey(uid, documentId);
			const connection = activeConnections.get(socketId);

			// Remove from entity editors
			const editors = entityEditors.get(entityKey);
			if (editors) {
				editors.delete(socketId);
				if (editors.size === 0) {
					entityEditors.delete(entityKey);
				}
			}

			// Remove from connection's entities
			if (connection?.entities) {
				connection.entities.delete(entityKey);
			}

			// Leave the presence room
			const io = strapi.$io?.server;
			const socket = io?.sockets.sockets.get(socketId);
			if (socket) {
				socket.leave(`presence:${entityKey}`);
			}

			// Broadcast update to remaining editors
			if (broadcast) {
				await broadcastPresenceUpdate(uid, documentId);
			}

			strapi.log.debug(`socket.io: Socket ${socketId} left entity ${entityKey}`);

			return { success: true, entityKey };
		},

		/**
		 * Gets all editors currently editing an entity
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @returns {Array} List of editors with user info
		 */
		async getEntityEditors(uid, documentId) {
			const entityKey = getEntityKey(uid, documentId);
			const editorSocketIds = entityEditors.get(entityKey) || new Set();
			
			const editors = [];
			for (const socketId of editorSocketIds) {
				const connection = activeConnections.get(socketId);
				if (connection?.user) {
					editors.push({
						socketId,
						user: {
							id: connection.user.id,
							username: connection.user.username,
							email: connection.user.email,
							firstname: connection.user.firstname,
							lastname: connection.user.lastname,
						},
						joinedAt: connection.entities?.get(entityKey) || Date.now(),
					});
				}
			}

			return editors;
		},

		/**
		 * Updates heartbeat for a socket to keep presence alive
		 * @param {string} socketId - Socket ID
		 * @returns {object} Heartbeat result
		 */
		heartbeat(socketId) {
			const connection = activeConnections.get(socketId);
			if (!connection) {
				return { success: false, error: 'Socket not registered' };
			}

			connection.lastSeen = Date.now();
			return { success: true, lastSeen: connection.lastSeen };
		},

		/**
		 * Cleans up stale connections that haven't sent heartbeat
		 * @returns {number} Number of connections cleaned up
		 */
		async cleanup() {
			const settings = getPresenceSettings();
			const staleTimeout = settings.staleTimeout;
			const now = Date.now();
			let cleanedUp = 0;

			for (const [socketId, connection] of activeConnections) {
				if (now - connection.lastSeen > staleTimeout) {
					await this.unregisterConnection(socketId);
					cleanedUp++;
				}
			}

			if (cleanedUp > 0) {
				strapi.log.info(`socket.io: Presence cleanup removed ${cleanedUp} stale connection(s)`);
			}

			return cleanedUp;
		},

		/**
		 * Starts the cleanup interval
		 */
		startCleanupInterval() {
			const settings = getPresenceSettings();
			if (!settings.enabled) return;

			// Run cleanup every minute
			cleanupInterval = setInterval(() => {
				this.cleanup();
			}, 60000);

			strapi.log.debug('socket.io: Presence cleanup interval started');
		},

		/**
		 * Stops the cleanup interval
		 */
		stopCleanupInterval() {
			if (cleanupInterval) {
				clearInterval(cleanupInterval);
				cleanupInterval = null;
			}
		},

		/**
		 * Gets presence statistics
		 * @returns {object} Presence stats
		 */
		getStats() {
			const totalConnections = activeConnections.size;
			const totalEntitiesBeingEdited = entityEditors.size;
			
			// Count authenticated vs anonymous
			let authenticated = 0;
			let anonymous = 0;
			for (const connection of activeConnections.values()) {
				if (connection.user) {
					authenticated++;
				} else {
					anonymous++;
				}
			}

			return {
				totalConnections,
				authenticated,
				anonymous,
				totalEntitiesBeingEdited,
				entities: Array.from(entityEditors.entries()).map(([key, editors]) => ({
					entityKey: key,
					editorCount: editors.size,
				})),
			};
		},

		/**
		 * Gets all entities a user is currently editing
		 * @param {string} socketId - Socket ID
		 * @returns {Array} List of entity keys
		 */
		getUserEntities(socketId) {
			const connection = activeConnections.get(socketId);
			if (!connection) return [];

			return Array.from(connection.entities.keys());
		},

		/**
		 * Checks if an entity is being edited by anyone
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @returns {boolean} True if entity has editors
		 */
		isEntityBeingEdited(uid, documentId) {
			const entityKey = getEntityKey(uid, documentId);
			const editors = entityEditors.get(entityKey);
			return editors ? editors.size > 0 : false;
		},

		/**
		 * Broadcasts a typing indicator for an entity
		 * @param {string} socketId - Socket ID of typing user
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @param {string} fieldName - Name of field being edited
		 */
		broadcastTyping(socketId, uid, documentId, fieldName) {
			const io = strapi.$io?.server;
			if (!io) return;

			const connection = activeConnections.get(socketId);
			if (!connection?.user) return;

			const entityKey = getEntityKey(uid, documentId);
			const roomName = `presence:${entityKey}`;

			// Emit to all except sender
			const socket = io.sockets.sockets.get(socketId);
			if (socket) {
				socket.to(roomName).emit('presence:typing', {
					uid,
					documentId,
					user: {
						id: connection.user.id,
						username: connection.user.username,
					},
					fieldName,
					timestamp: Date.now(),
				});
			}
		},
	};
};
