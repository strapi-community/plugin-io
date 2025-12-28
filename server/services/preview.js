'use strict';

const { pluginId } = require('../utils/pluginId');

/**
 * Live Preview Service for Socket.IO
 * Enables real-time preview of draft changes before publishing.
 * Supports debounced field updates for optimal performance.
 */
module.exports = ({ strapi }) => {
	// Map: "uid:documentId" -> Set<socketId> (preview subscribers)
	const previewSubscribers = new Map();
	
	// Map: socketId -> { debounceTimers: Map<entityKey, timerId> }
	const socketState = new Map();

	/**
	 * Gets the entity key from uid and documentId
	 * @param {string} uid - Content type UID
	 * @param {string} documentId - Document ID
	 * @returns {string} Entity key
	 */
	const getEntityKey = (uid, documentId) => `${uid}:${documentId}`;

	/**
	 * Gets preview settings from plugin settings
	 * @returns {object} Preview settings
	 */
	const getPreviewSettings = () => {
		const settings = strapi.$ioSettings || {};
		return {
			enabled: settings.livePreview?.enabled ?? true,
			draftEvents: settings.livePreview?.draftEvents ?? true,
			debounceMs: settings.livePreview?.debounceMs ?? 300,
			maxSubscriptionsPerSocket: settings.livePreview?.maxSubscriptionsPerSocket ?? 50,
		};
	};

	/**
	 * Emits a preview event to all subscribers
	 * @param {string} uid - Content type UID
	 * @param {string} documentId - Document ID
	 * @param {string} eventType - Event type
	 * @param {object} data - Event data
	 */
	const emitToSubscribers = (uid, documentId, eventType, data) => {
		const io = strapi.$io?.server;
		if (!io) return;

		const entityKey = getEntityKey(uid, documentId);
		const subscribers = previewSubscribers.get(entityKey);
		
		if (!subscribers || subscribers.size === 0) return;

		const roomName = `preview:${entityKey}`;
		io.to(roomName).emit(eventType, {
			uid,
			documentId,
			...data,
			timestamp: Date.now(),
		});

		strapi.log.debug(`socket.io: Preview event '${eventType}' sent to ${subscribers.size} subscriber(s) for ${entityKey}`);
	};

	return {
		/**
		 * Subscribes a socket to preview updates for an entity
		 * @param {string} socketId - Socket ID
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @returns {object} Subscription result
		 */
		async subscribe(socketId, uid, documentId) {
			const settings = getPreviewSettings();
			
			if (!settings.enabled) {
				return { success: false, error: 'Live preview is disabled' };
			}

			const entityKey = getEntityKey(uid, documentId);
			const io = strapi.$io?.server;
			const socket = io?.sockets.sockets.get(socketId);

			if (!socket) {
				return { success: false, error: 'Socket not found' };
			}

			// Check subscription limit
			const currentSubs = Array.from(socket.rooms).filter(r => r.startsWith('preview:')).length;
			if (currentSubs >= settings.maxSubscriptionsPerSocket) {
				return { success: false, error: `Maximum preview subscriptions (${settings.maxSubscriptionsPerSocket}) reached` };
			}

			// Add to subscribers
			if (!previewSubscribers.has(entityKey)) {
				previewSubscribers.set(entityKey, new Set());
			}
			previewSubscribers.get(entityKey).add(socketId);

			// Join preview room
			socket.join(`preview:${entityKey}`);

			// Initialize socket state if needed
			if (!socketState.has(socketId)) {
				socketState.set(socketId, { debounceTimers: new Map() });
			}

			strapi.log.debug(`socket.io: Socket ${socketId} subscribed to preview for ${entityKey}`);

			// Fetch current entity state to send initial data
			try {
				const entity = await strapi.documents(uid).findOne({ documentId });
				if (entity) {
					socket.emit('preview:initial', {
						uid,
						documentId,
						data: entity,
						timestamp: Date.now(),
					});
				}
			} catch (err) {
				strapi.log.warn(`socket.io: Could not fetch initial preview data for ${entityKey}: ${err.message}`);
			}

			return {
				success: true,
				entityKey,
				subscriberCount: previewSubscribers.get(entityKey).size,
			};
		},

		/**
		 * Unsubscribes a socket from preview updates
		 * @param {string} socketId - Socket ID
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @returns {object} Unsubscription result
		 */
		unsubscribe(socketId, uid, documentId) {
			const entityKey = getEntityKey(uid, documentId);
			const subscribers = previewSubscribers.get(entityKey);

			if (subscribers) {
				subscribers.delete(socketId);
				if (subscribers.size === 0) {
					previewSubscribers.delete(entityKey);
				}
			}

			// Leave preview room
			const io = strapi.$io?.server;
			const socket = io?.sockets.sockets.get(socketId);
			if (socket) {
				socket.leave(`preview:${entityKey}`);
			}

			// Clear debounce timers
			const state = socketState.get(socketId);
			if (state?.debounceTimers.has(entityKey)) {
				clearTimeout(state.debounceTimers.get(entityKey));
				state.debounceTimers.delete(entityKey);
			}

			strapi.log.debug(`socket.io: Socket ${socketId} unsubscribed from preview for ${entityKey}`);

			return { success: true, entityKey };
		},

		/**
		 * Cleans up all subscriptions for a socket
		 * @param {string} socketId - Socket ID
		 */
		cleanupSocket(socketId) {
			// Remove from all subscriber sets
			for (const [entityKey, subscribers] of previewSubscribers) {
				if (subscribers.has(socketId)) {
					subscribers.delete(socketId);
					if (subscribers.size === 0) {
						previewSubscribers.delete(entityKey);
					}
				}
			}

			// Clear socket state
			const state = socketState.get(socketId);
			if (state) {
				for (const timerId of state.debounceTimers.values()) {
					clearTimeout(timerId);
				}
				socketState.delete(socketId);
			}
		},

		/**
		 * Emits a draft change event to preview subscribers
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @param {object} data - Changed data
		 * @param {object} diff - Field-level diff (optional)
		 */
		emitDraftChange(uid, documentId, data, diff = null) {
			const settings = getPreviewSettings();
			
			if (!settings.enabled || !settings.draftEvents) return;

			emitToSubscribers(uid, documentId, 'preview:change', {
				data,
				diff,
				isDraft: true,
			});
		},

		/**
		 * Emits a debounced field change event
		 * @param {string} socketId - Socket ID of the editor
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @param {string} fieldName - Name of changed field
		 * @param {*} value - New field value
		 */
		emitFieldChange(socketId, uid, documentId, fieldName, value) {
			const settings = getPreviewSettings();
			
			if (!settings.enabled) return;

			const entityKey = getEntityKey(uid, documentId);
			const state = socketState.get(socketId);

			// Clear existing debounce timer
			if (state?.debounceTimers.has(entityKey)) {
				clearTimeout(state.debounceTimers.get(entityKey));
			}

			// Set new debounce timer
			const timerId = setTimeout(() => {
				emitToSubscribers(uid, documentId, 'preview:field', {
					fieldName,
					value,
					editorSocketId: socketId,
				});

				state?.debounceTimers.delete(entityKey);
			}, settings.debounceMs);

			if (state) {
				state.debounceTimers.set(entityKey, timerId);
			}
		},

		/**
		 * Emits publish event to preview subscribers
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @param {object} data - Published data
		 */
		emitPublish(uid, documentId, data) {
			emitToSubscribers(uid, documentId, 'preview:publish', {
				data,
				isDraft: false,
			});
		},

		/**
		 * Emits unpublish event to preview subscribers
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 */
		emitUnpublish(uid, documentId) {
			emitToSubscribers(uid, documentId, 'preview:unpublish', {
				isDraft: true,
			});
		},

		/**
		 * Gets the number of preview subscribers for an entity
		 * @param {string} uid - Content type UID
		 * @param {string} documentId - Document ID
		 * @returns {number} Subscriber count
		 */
		getSubscriberCount(uid, documentId) {
			const entityKey = getEntityKey(uid, documentId);
			return previewSubscribers.get(entityKey)?.size || 0;
		},

		/**
		 * Gets all entities with active preview subscribers
		 * @returns {Array} List of entity keys with subscriber counts
		 */
		getActivePreviewEntities() {
			const entities = [];
			for (const [entityKey, subscribers] of previewSubscribers) {
				const [uid, documentId] = entityKey.split(':');
				entities.push({
					uid,
					documentId,
					entityKey,
					subscriberCount: subscribers.size,
				});
			}
			return entities;
		},

		/**
		 * Checks if live preview is enabled
		 * @returns {boolean} True if enabled
		 */
		isEnabled() {
			return getPreviewSettings().enabled;
		},

		/**
		 * Gets preview statistics
		 * @returns {object} Preview stats
		 */
		getStats() {
			let totalSubscriptions = 0;
			for (const subscribers of previewSubscribers.values()) {
				totalSubscriptions += subscribers.size;
			}

			return {
				totalEntitiesWithSubscribers: previewSubscribers.size,
				totalSubscriptions,
				entities: this.getActivePreviewEntities(),
			};
		},
	};
};
