import { CONTENT_TYPE_UID_RE, ROOM_PREFIX } from '../utils/constants.js';
import { isClusterAdapter } from '../cluster/env.js';
import { createTokenBucket } from './rate-limit.js';

const DOCUMENT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SUBSCRIBE_PER_SECOND = 10;
const SEPARATOR = '|';

/** Error messages sent to clients. They never reveal whether a content type exists. */
const ERRORS = Object.freeze({
	DISABLED: 'Entity subscriptions are disabled',
	INVALID: 'Invalid parameters: uid and documentId are required',
	NOT_ALLOWED: 'Not allowed',
	NOT_FOUND: 'Entity not found',
	RATE: 'Rate limit exceeded',
	FAILED: 'Subscription failed',
});

/**
 * Builds the room of one audience's subscribers to one document. The room
 * carries the audience, so an emit sanitizes the entry once per audience and
 * sends it only to sockets of that audience.
 *
 * @param {string} audience - Audience room (`io-role-<type>` or `io-token-<id>`).
 * @param {string} uid - Content type uid.
 * @param {string} documentId - Document id.
 * @returns {string} Room name.
 */
const entityRoom = (audience, uid, documentId) =>
	`${ROOM_PREFIX.ENTITY}${audience}${SEPARATOR}${uid}${SEPARATOR}${documentId}`;

/**
 * Parses an entity room name.
 *
 * @param {string} room - Room name.
 * @returns {{ audience: string, uid: string, documentId: string } | null} Parts, or null for other rooms.
 */
function parseEntityRoom(room) {
	if (typeof room !== 'string' || !room.startsWith(ROOM_PREFIX.ENTITY)) return null;
	const [audience, uid, documentId] = room.slice(ROOM_PREFIX.ENTITY.length).split(SEPARATOR);
	if (!audience || !uid || !documentId) return null;
	return { audience, uid, documentId };
}

/**
 * Reads `{ uid, documentId }` from a client payload. `id` is accepted as an
 * alias of `documentId` (the 5.x client API used `{ uid, id }`).
 *
 * @param {unknown} data - Client payload.
 * @returns {{ uid: string, documentId: string } | null} Parsed target or null.
 */
function parseTarget(data) {
	if (!data || typeof data !== 'object') return null;
	const uid = data.uid;
	const documentId = data.documentId ?? data.id;
	if (typeof uid !== 'string' || !CONTENT_TYPE_UID_RE.test(uid)) return null;
	if (typeof documentId !== 'string' || !DOCUMENT_ID_RE.test(documentId)) return null;
	return { uid, documentId };
}

/**
 * Entity subscriptions: a Users & Permissions or API-token socket can follow
 * single documents (`subscribe-entity`). Events for those documents reach
 * the socket even when the content type or action is not broadcast under
 * Settings > Events. Each subscription is checked against the read
 * permission of the socket's own audience, and the payload is sanitized with
 * that audience's permissions at every emit.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Subscriptions service API.
 */
export default ({ strapi }) => {
	/** Subscriber count per `<uid>|<documentId>` on this server (all audiences). */
	const counts = new Map();
	/** Subscribe requests per socket that passed the limit check and still run their async checks. */
	const pending = new WeakMap();
	let trackedAdapter = null;

	const settings = () => strapi.plugin('io').service('settings').current().subscriptions;
	const key = (uid, documentId) => `${uid}${SEPARATOR}${documentId}`;

	const onJoin = (room) => {
		const parts = parseEntityRoom(room);
		if (!parts) return;
		const k = key(parts.uid, parts.documentId);
		counts.set(k, (counts.get(k) || 0) + 1);
	};
	const onLeave = (room) => {
		const parts = parseEntityRoom(room);
		if (!parts) return;
		const k = key(parts.uid, parts.documentId);
		const next = (counts.get(k) || 0) - 1;
		if (next > 0) counts.set(k, next);
		else counts.delete(k);
	};

	/**
	 * Returns the audience room of a socket, or null for admin sockets and
	 * sockets without a role or token.
	 *
	 * @param {import('socket.io').Socket} socket - Connected socket.
	 * @returns {string | null} Audience room name.
	 */
	function audienceOf(socket) {
		const strategies = strapi.plugin('io').service('strategy');
		if ((socket.data.kind === 'public' || socket.data.kind === 'user') && socket.data.role?.type) {
			return strategies.role.getRoomName(socket.data.role);
		}
		if (socket.data.kind === 'token' && socket.data.token?.id !== undefined) {
			return strategies.token.getRoomName(socket.data.token);
		}
		return null;
	}

	/**
	 * Lists a socket's subscriptions.
	 *
	 * @param {import('socket.io').Socket} socket - Connected socket.
	 * @returns {Array<{ uid: string, documentId: string, id: string }>} Subscriptions.
	 */
	function list(socket) {
		const out = [];
		for (const room of socket.rooms) {
			const parts = parseEntityRoom(room);
			if (parts) out.push({ uid: parts.uid, documentId: parts.documentId, id: parts.documentId });
		}
		return out;
	}

	/**
	 * Checks that the document exists in a state the audience could receive.
	 * One indexed query on `document_id`, across locales.
	 *
	 * @param {string} uid - Content type uid.
	 * @param {string} documentId - Document id.
	 * @returns {Promise<boolean>} True when it exists.
	 */
	async function exists(uid, documentId) {
		const contentType = strapi.contentTypes[uid];
		const publishedOnly =
			contentType.options?.draftAndPublish === true &&
			strapi.plugin('io').service('settings').current().events.onlyPublished;
		const where = { documentId };
		if (publishedOnly) where.publishedAt = { $notNull: true };
		const row = await strapi.db.query(uid).findOne({ where, select: ['id'] });
		return Boolean(row);
	}

	return {
		ERRORS,
		entityRoom,
		parseEntityRoom,
		parseTarget,

		/**
		 * Starts counting subscribers through the adapter's `join-room` and
		 * `leave-room` events, which also fire when a socket disconnects.
		 *
		 * @param {import('socket.io').Server} server - Socket.IO server.
		 * @see https://socket.io/docs/v4/rooms/#room-events
		 */
		track(server) {
			const adapter = server.of('/').adapter;
			if (trackedAdapter === adapter) return;
			this.untrack();
			adapter.on('join-room', onJoin);
			adapter.on('leave-room', onLeave);
			trackedAdapter = adapter;
		},

		/** Stops counting and clears the index. */
		untrack() {
			trackedAdapter?.off?.('join-room', onJoin);
			trackedAdapter?.off?.('leave-room', onLeave);
			trackedAdapter = null;
			counts.clear();
		},

		/**
		 * Checks whether any socket follows one of the documents. With an
		 * adapter that spans several servers, subscribers on other nodes are
		 * not counted here, so the check answers true while subscriptions are
		 * enabled.
		 *
		 * @param {string} uid - Content type uid.
		 * @param {Iterable<string>} documentIds - Document ids.
		 * @returns {boolean} True when an emit may reach a subscriber.
		 */
		hasSubscribers(uid, documentIds) {
			if (!settings().enabled) return false;
			if (isClusterAdapter(trackedAdapter)) return true;
			if (!counts.size) return false;
			for (const documentId of documentIds) if (counts.has(key(uid, documentId))) return true;
			return false;
		},

		audienceOf,
		list,

		/**
		 * Subscribes a socket to one document after checking the setting, the
		 * per-socket limit, the audience's read permission and that the
		 * document exists.
		 *
		 * @param {import('socket.io').Socket} socket - Connected socket.
		 * @param {unknown} data - `{ uid, documentId }` (or `{ uid, id }`).
		 * @returns {Promise<{ success: true, uid: string, documentId: string, id: string } | { success: false, error: string }>} Outcome.
		 */
		async subscribe(socket, data) {
			const { enabled, maxPerSocket } = settings();
			if (!enabled) return { success: false, error: ERRORS.DISABLED };
			const target = parseTarget(data);
			if (!target) return { success: false, error: ERRORS.INVALID };
			const { uid, documentId } = target;
			const audience = audienceOf(socket);
			const contentType = strapi.contentTypes[uid];
			if (!audience || !contentType) return { success: false, error: ERRORS.NOT_ALLOWED };

			const room = entityRoom(audience, uid, documentId);
			if (socket.rooms.has(room)) return { success: true, uid, documentId, id: documentId };
			const limitReached = { success: false, error: `Maximum subscriptions (${maxPerSocket}) reached` };
			// Requests that run at the same time each reserve a slot before the
			// first await, so parallel subscribes cannot pass the check together.
			const inFlight = pending.get(socket) || 0;
			if (list(socket).length + inFlight >= maxPerSocket) return limitReached;
			pending.set(socket, inFlight + 1);

			try {
				const rooms = strapi.plugin('io').service('rooms');
				const entry = (await rooms.getAudiences()).find((a) => a.name === audience);
				if (!entry || !rooms.canRead(entry, uid)) return { success: false, error: ERRORS.NOT_ALLOWED };

				try {
					if (!(await exists(uid, documentId))) return { success: false, error: ERRORS.NOT_FOUND };
				} catch (error) {
					strapi.log.warn(`[io] Entity subscription check failed: ${error?.name || 'Error'}`);
					return { success: false, error: ERRORS.FAILED };
				}
				// The socket may have disconnected while the checks ran.
				if (!socket.connected) return { success: false, error: ERRORS.FAILED };
				// Joining is synchronous, so this second check is the hard cap.
				if (!socket.rooms.has(room) && list(socket).length >= maxPerSocket) return limitReached;
				socket.join(room);
				return { success: true, uid, documentId, id: documentId };
			} finally {
				const left = (pending.get(socket) || 1) - 1;
				if (left > 0) pending.set(socket, left);
				else pending.delete(socket);
			}
		},

		/**
		 * Removes one subscription of a socket.
		 *
		 * @param {import('socket.io').Socket} socket - Connected socket.
		 * @param {unknown} data - `{ uid, documentId }` (or `{ uid, id }`).
		 * @returns {{ success: true, uid: string, documentId: string, id: string } | { success: false, error: string }} Outcome.
		 */
		unsubscribe(socket, data) {
			const target = parseTarget(data);
			if (!target) return { success: false, error: ERRORS.INVALID };
			const audience = audienceOf(socket);
			if (audience) socket.leave(entityRoom(audience, target.uid, target.documentId));
			return { success: true, uid: target.uid, documentId: target.documentId, id: target.documentId };
		},

		/**
		 * Registers the client events `subscribe-entity`, `unsubscribe-entity`
		 * and `get-entity-subscriptions` on a socket. Admin presence sockets
		 * are skipped. Subscribing is limited to ten requests per second.
		 *
		 * @param {import('socket.io').Socket} socket - Connected socket.
		 */
		register(socket) {
			if (socket.data.kind === 'admin') return;
			const allow = createTokenBucket(() => SUBSCRIBE_PER_SECOND);
			const reply = (callback, payload) => typeof callback === 'function' && callback(payload);
			socket.on('subscribe-entity', async (data, callback) => {
				if (!allow()) return reply(callback, { success: false, error: ERRORS.RATE });
				try {
					reply(callback, await this.subscribe(socket, data));
				} catch {
					reply(callback, { success: false, error: ERRORS.FAILED });
				}
			});
			socket.on('unsubscribe-entity', (data, callback) => reply(callback, this.unsubscribe(socket, data)));
			socket.on('get-entity-subscriptions', (callback) =>
				reply(callback, { success: true, subscriptions: list(socket) })
			);
		},
	};
};

export { ERRORS, entityRoom, parseEntityRoom, parseTarget };
