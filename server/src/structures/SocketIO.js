import { Server } from 'socket.io';
import { createHandshake } from '../middleware/handshake.js';
import { pluginId } from '../utils/pluginId.js';
import { originsOf, resolveSocketServerOptions } from './resolveSocketServerOptions.js';
import { attachUpgradeForwarder } from './upgrade-forwarder.js';

const REVALIDATE_MS = 5 * 60 * 1000;

/**
 * The plugin's Socket.IO wrapper, exposed as `strapi.$io`.
 *
 * - Attaches Socket.IO to Strapi's HTTP server and forwards foreign upgrades
 *   (Data Transfer) back to Strapi (#112).
 * - Authenticates every namespace with the plugin handshake.
 * - Delivers content events only to role/token rooms with read permission,
 *   sanitized per audience; a room is skipped if sanitizing fails.
 * - Applies live admin settings (ping, timeouts) and re-validates
 *   authenticated sockets.
 */
class SocketIO {
	/**
	 * @param {import('socket.io').ServerOptions | undefined} options - `config.socket.serverOptions`.
	 * @param {{ strapi?: import('@strapi/types').Core.Strapi, deferHandshake?: boolean }} [deps] - Strapi instance (defaults to the global); `deferHandshake` waits for `useHandshake()`.
	 */
	constructor(options, deps = {}) {
		const strapiInstance = deps.strapi ?? globalThis.strapi;
		this.strapi = strapiInstance;
		const settingsService = strapiInstance.plugin(pluginId).service('settings');
		const httpServer = strapiInstance.server.httpServer;

		const trustedOrigins = originsOf([
			strapiInstance.config?.get?.('server.url'),
			strapiInstance.config?.get?.('admin.url'),
		]);
		const serverOptions = resolveSocketServerOptions(options, () => settingsService.current(), { trustedOrigins });
		const before = httpServer.listeners('upgrade');
		this._socket = new Server(httpServer, serverOptions);
		const engineListeners = httpServer.listeners('upgrade').filter((l) => !before.includes(l));
		const path = this._socket.path();
		const enginePath = serverOptions.addTrailingSlash === false ? path : `${path.replace(/\/$/, '')}/`;
		this._removeUpgradeForwarder = attachUpgradeForwarder({
			httpServer,
			enginePath,
			ownListeners: engineListeners,
		});
		if (!this._removeUpgradeForwarder) {
			strapiInstance.log?.warn?.(
				'[io] This Node.js version has no shouldUpgradeCallback (needs 22.21+ or 24.9+). Strapi Data Transfer will not work next to Socket.IO.'
			);
		}

		this._handshake = createHandshake({ strapi: strapiInstance });
		this._handshakeAttached = false;
		this._socket.on('new_namespace', (namespace) => {
			if (namespace.name !== '/') namespace.use(this._handshake);
		});
		if (!deps.deferHandshake) this.useHandshake();

		this._applySettings(settingsService.current(), serverOptions);
		this._unsubscribeSettings = settingsService.onChange((next) => this._applySettings(next, serverOptions));

		this._revalidateTimer = setInterval(() => {
			this.revalidateSockets().catch(() => {});
		}, REVALIDATE_MS);
		this._revalidateTimer.unref?.();
		this._expiryTimers = new Map();
	}

	/**
	 * Adds the plugin handshake to the default namespace. The plugin calls it
	 * right after `hooks.init`, so middleware registered there with
	 * `$io.server.use()` runs before the handshake, as in 5.x. Calling it
	 * again does nothing.
	 */
	useHandshake() {
		if (this._handshakeAttached) return;
		this._handshakeAttached = true;
		this._socket.use(this._handshake);
	}

	/**
	 * Applies ping and timeout settings to new connections. Values set in
	 * `config.socket.serverOptions` take precedence.
	 *
	 * @param {object} settings - Current admin settings.
	 * @param {object} configured - Resolved server options.
	 */
	_applySettings(settings, configured) {
		const { pingInterval, pingTimeout, connectionTimeout } = settings.connection;
		const engineOpts = this._socket.engine?.opts;
		if (engineOpts) {
			if (configured.pingInterval === undefined) engineOpts.pingInterval = pingInterval;
			if (configured.pingTimeout === undefined) engineOpts.pingTimeout = pingTimeout;
		}
		if (configured.connectTimeout === undefined) this._socket.connectTimeout(connectionTimeout);
	}

	/**
	 * Schedules a disconnect when a socket's credentials expire.
	 *
	 * @param {import('socket.io').Socket} socket - Connected socket.
	 */
	trackExpiry(socket) {
		const expiresAt = socket.data.expiresAt;
		if (!expiresAt) return;
		const delay = Math.min(Math.max(expiresAt - Date.now(), 0), 2 ** 31 - 1);
		const timer = setTimeout(() => socket.disconnect(true), delay);
		timer.unref?.();
		this._expiryTimers.set(socket.id, timer);
		socket.once('disconnect', () => {
			clearTimeout(timer);
			this._expiryTimers.delete(socket.id);
		});
	}

	/**
	 * Re-checks authenticated sockets and disconnects the ones whose user,
	 * role, session, admin account or API token is no longer valid. Sockets
	 * are checked in one batch per kind (one query for all users, admins or
	 * tokens), not one by one.
	 *
	 * Pass `ids` to check only the sockets of those users, admins or API
	 * tokens (used by the lifecycle hooks, so one changed user does not
	 * re-check every connection).
	 *
	 * @param {('user'|'token'|'admin')[]} [kinds] - Kinds to check; all by default.
	 * @param {{ ids?: Iterable<number | string> }} [options] - Limit the check to these user, admin or token ids.
	 * @returns {Promise<number>} Number of disconnected sockets.
	 */
	async revalidateSockets(kinds = ['user', 'token', 'admin'], { ids } = {}) {
		const strategies = this.strapi.plugin(pluginId).service('strategy');
		const byKind = { user: strategies.role, token: strategies.token, admin: strategies.admin };
		const only = ids ? new Set([...ids].map(String)) : null;
		const namespaces = this._socket._nsps ? [...this._socket._nsps.values()] : [this._socket.of('/')];
		const groups = new Map();
		for (const socket of namespaces.flatMap((nsp) => [...nsp.sockets.values()])) {
			const kind = socket.data.kind;
			if (!kinds.includes(kind) || !byKind[kind]) continue;
			if (only && !only.has(String(SocketIO.identityId(socket)))) continue;
			if (!groups.has(kind)) groups.set(kind, []);
			groups.get(kind).push(socket);
		}
		let dropped = 0;
		for (const [kind, sockets] of groups) {
			let failed;
			try {
				failed = await byKind[kind].revalidateMany(sockets);
			} catch {
				failed = new Set(sockets.map((socket) => socket.id));
			}
			for (const socket of sockets) {
				if (!failed.has(socket.id)) continue;
				socket.disconnect(true);
				dropped += 1;
			}
		}
		return dropped;
	}

	/**
	 * Returns the id that identifies a socket's credentials: the user id for
	 * JWT and admin sockets, the API token id for token sockets.
	 *
	 * @param {import('socket.io').Socket} socket - Connected socket.
	 * @returns {number | string | undefined} Identity id.
	 */
	static identityId(socket) {
		if (socket.data.kind === 'token') return socket.data.token?.id;
		if (socket.data.kind === 'admin') return socket.data.admin?.id;
		return socket.data.user?.id;
	}

	/**
	 * Emits a content event to every audience that may read the content type,
	 * and to the audience's entity subscribers of that document. Each
	 * audience receives data sanitized with its own permissions, once per
	 * socket even when a socket is in both rooms.
	 *
	 * @param {object} params - Parameters.
	 * @param {string} params.event - Action (`create`, `update`, `publish`, ...).
	 * @param {{ uid: string, singularName: string }} params.schema - Content type.
	 * @param {object} params.data - Entry from the Document Service.
	 * @param {boolean} [params.broadcast] - Send to the audience rooms (default). With `false` only the
	 *   entity subscribers of `data.documentId` receive the event.
	 * @returns {Promise<number>} Number of audiences the event was sent to.
	 */
	async emit({ event, schema: schemaInput, data, broadcast = true }) {
		const schema = this._resolveSchema(schemaInput);
		if (!data || !schema?.uid) return 0;
		const plugin = this.strapi.plugin(pluginId);
		const sanitize = plugin.service('sanitize');
		const transform = plugin.service('transform');
		const rooms = plugin.service('rooms');
		const eventName = `${schema.singularName}:${event}`;
		let delivered = 0;

		for (const audience of await rooms.getAudiences()) {
			if (!rooms.canRead(audience, schema.uid)) continue;
			const targets = this._targetsFor(audience.name, schema.uid, data.documentId, broadcast);
			if (!targets.length) continue;
			try {
				const sanitized = await sanitize.output({
					data,
					schema,
					options: {
						auth: {
							name: audience.strategy.name,
							ability: audience.ability,
							strategy: { verify: audience.strategy.verify },
							credentials: audience.strategy.credentials(audience.entry),
						},
					},
				});
				this._socket.to(targets).emit(eventName, { ...transform.response({ data: sanitized, schema }) });
				delivered += 1;
			} catch (error) {
				this.strapi.log.warn(
					`[io] Skipped "${eventName}" for room ${audience.name}: ${error?.name === 'SanitizeError' ? error.message : 'emit failed'}`
				);
			}
		}
		plugin.service('monitoring').recordEvent(eventName, { audiences: delivered });
		return delivered;
	}

	/**
	 * Emits a minimal event (`{ data: { documentId, locale } }`) to the
	 * audiences that may read the content type. Used for delete and unpublish.
	 *
	 * @param {object} params - Parameters.
	 * @param {string} params.event - Action name.
	 * @param {{ uid: string, singularName: string }} params.schema - Content type.
	 * @param {{ documentId: string, locale?: string | null }} params.data - Identifiers.
	 * @param {boolean} [params.broadcast] - Send to the audience rooms (default); `false` reaches entity subscribers only.
	 * @returns {Promise<number>} Number of rooms reached.
	 */
	async emitIdentifier({ event, schema: schemaInput, data, broadcast = true }) {
		const schema = this._resolveSchema(schemaInput);
		if (!schema?.uid || !data?.documentId) return 0;
		const plugin = this.strapi.plugin(pluginId);
		const rooms = plugin.service('rooms');
		const eventName = `${schema.singularName}:${event}`;
		const payload = { documentId: data.documentId };
		if (data.locale) payload.locale = data.locale;
		const names = (await rooms.getAudiences())
			.filter((a) => rooms.canRead(a, schema.uid))
			.flatMap((a) => this._targetsFor(a.name, schema.uid, data.documentId, broadcast));
		if (names.length) this._socket.to(names).emit(eventName, { data: payload });
		plugin.service('monitoring').recordEvent(eventName, { audiences: names.length });
		return names.length;
	}

	/**
	 * Returns the rooms of one audience that should receive an event: the
	 * audience room when broadcasting, plus the room of the audience's
	 * subscribers to the document while entity subscriptions are enabled.
	 * Rooms without sockets are left out.
	 *
	 * @param {string} audience - Audience room name.
	 * @param {string} uid - Content type uid.
	 * @param {string | undefined} documentId - Document id.
	 * @param {boolean} broadcast - Whether the audience room is a target.
	 * @returns {string[]} Room names.
	 */
	_targetsFor(audience, uid, documentId, broadcast) {
		const targets = [];
		if (broadcast && this._hasSockets(audience)) targets.push(audience);
		const plugin = this.strapi.plugin(pluginId);
		if (documentId && plugin.service('settings').current().subscriptions?.enabled) {
			const room = plugin.service('subscriptions').entityRoom(audience, uid, documentId);
			if (this._hasSockets(room)) targets.push(room);
		}
		return targets;
	}

	/**
	 * Checks whether a room has at least one socket in any namespace on this
	 * server. Rooms without sockets are skipped before sanitizing, so an emit
	 * costs one sanitize pass per room that is actually listening.
	 *
	 * With an adapter that spans several servers (Redis), rooms on other nodes
	 * are not visible here, so the check is skipped and every room is used.
	 *
	 * @param {string} room - Room name.
	 * @returns {boolean} True when the room may have listeners.
	 */
	_hasSockets(room) {
		const namespaces = this._socket._nsps ? [...this._socket._nsps.values()] : [this._socket.of('/')];
		for (const nsp of namespaces) {
			const adapter = nsp.adapter;
			if (adapter && adapter.constructor?.name !== 'Adapter' && adapter.constructor?.name !== 'SessionAwareAdapter') {
				return true;
			}
			if (adapter?.rooms?.get(room)?.size) return true;
		}
		return false;
	}

	/**
	 * Accepts a content type uid or an object with at least `uid`.
	 *
	 * @param {string | { uid: string, singularName?: string }} schema - Content type.
	 * @returns {{ uid: string, singularName: string } | null} Resolved schema.
	 */
	_resolveSchema(schema) {
		const uid = typeof schema === 'string' ? schema : schema?.uid;
		const contentType = uid ? this.strapi.contentTypes?.[uid] : undefined;
		if (!uid) return null;
		return { uid, singularName: schema?.singularName ?? contentType?.info?.singularName ?? uid.split('.').pop() };
	}

	/**
	 * Emits a custom event. Sensitive fields are removed from `data`.
	 * Without `rooms` the event goes to every connected client.
	 *
	 * @param {object} params - Parameters.
	 * @param {string} params.event - Event name.
	 * @param {any} params.data - Payload (sent as `{ data }`).
	 * @param {string[]} [params.rooms] - Target rooms.
	 */
	async raw({ event, data, rooms }) {
		const plugin = this.strapi.plugin(pluginId);
		const target = rooms?.length ? this._socket.to(rooms) : this._socket;
		target.emit(event, { data: plugin.service('sanitize').sanitizeRaw(data) });
		plugin.service('monitoring').recordEvent(event, { source: 'raw', audiences: rooms?.length ?? null });
	}

	/**
	 * Adds a socket to a room. Plugin-managed rooms cannot be joined.
	 *
	 * @param {string} socketId - Socket id.
	 * @param {string} room - Room name.
	 * @returns {boolean} True when the socket exists and joined.
	 */
	joinRoom(socketId, room) {
		const socket = this._socket.of('/').sockets.get(socketId);
		if (!socket || isReservedRoom(room)) return false;
		socket.join(room);
		return true;
	}

	/**
	 * Removes a socket from a room.
	 *
	 * @param {string} socketId - Socket id.
	 * @param {string} room - Room name.
	 * @returns {boolean} True when the socket exists.
	 */
	leaveRoom(socketId, room) {
		const socket = this._socket.of('/').sockets.get(socketId);
		if (!socket) return false;
		socket.leave(room);
		return true;
	}

	/**
	 * Lists the socket ids in a room of the default namespace.
	 *
	 * @param {string} room - Room name.
	 * @returns {Promise<string[]>} Socket ids.
	 */
	async getSocketsInRoom(room) {
		const sockets = await this._socket.in(room).fetchSockets();
		return sockets.map((s) => s.id);
	}

	/**
	 * Sends an event to one socket.
	 *
	 * @param {string} socketId - Target socket id.
	 * @param {string} event - Event name.
	 * @param {any} data - Payload.
	 */
	sendPrivateMessage(socketId, event, data) {
		this._socket.to(socketId).emit(event, data);
	}

	/**
	 * Sends an event to every socket except the sender.
	 *
	 * @param {string} socketId - Sender socket id.
	 * @param {string} event - Event name.
	 * @param {any} data - Payload.
	 */
	broadcast(socketId, event, data) {
		this._socket.except(socketId).emit(event, data);
	}

	/**
	 * Sends an event to every socket of a namespace.
	 *
	 * @param {string} namespace - Namespace name, with or without leading slash.
	 * @param {string} event - Event name.
	 * @param {any} data - Payload.
	 */
	emitToNamespace(namespace, event, data) {
		const name = namespace.startsWith('/') ? namespace : `/${namespace}`;
		this._socket.of(name).emit(event, data);
	}

	/**
	 * Subscribes a socket to one document, with the same checks as the
	 * client event `subscribe-entity` (setting, limit, read permission of the
	 * socket's audience, document exists).
	 *
	 * @param {string} socketId - Socket id.
	 * @param {string} uid - Content type uid.
	 * @param {string} documentId - Document id.
	 * @returns {Promise<{ success: boolean, error?: string, uid?: string, documentId?: string, id?: string }>} Outcome.
	 */
	async subscribeToEntity(socketId, uid, documentId) {
		const socket = this._socket.of('/').sockets.get(socketId);
		if (!socket) return { success: false, error: 'Socket not found' };
		return this.strapi.plugin(pluginId).service('subscriptions').subscribe(socket, { uid, documentId });
	}

	/**
	 * Removes one entity subscription of a socket.
	 *
	 * @param {string} socketId - Socket id.
	 * @param {string} uid - Content type uid.
	 * @param {string} documentId - Document id.
	 * @returns {{ success: boolean, error?: string, uid?: string, documentId?: string, id?: string }} Outcome.
	 */
	unsubscribeFromEntity(socketId, uid, documentId) {
		const socket = this._socket.of('/').sockets.get(socketId);
		if (!socket) return { success: false, error: 'Socket not found' };
		return this.strapi.plugin(pluginId).service('subscriptions').unsubscribe(socket, { uid, documentId });
	}

	/**
	 * Lists the entity subscriptions of a socket.
	 *
	 * @param {string} socketId - Socket id.
	 * @returns {{ success: boolean, error?: string, subscriptions?: Array<{ uid: string, documentId: string, id: string }> }} Outcome.
	 */
	getEntitySubscriptions(socketId) {
		const socket = this._socket.of('/').sockets.get(socketId);
		if (!socket) return { success: false, error: 'Socket not found' };
		return { success: true, subscriptions: this.strapi.plugin(pluginId).service('subscriptions').list(socket) };
	}

	/**
	 * Disconnects a socket.
	 *
	 * @param {string} socketId - Socket id.
	 * @returns {boolean} True when the socket existed.
	 */
	disconnectSocket(socketId) {
		const socket = this._socket.of('/').sockets.get(socketId);
		if (!socket) return false;
		socket.disconnect(true);
		return true;
	}

	/**
	 * Releases every handle without closing Strapi's HTTP server, which Strapi
	 * closes itself after plugin destroy (#109).
	 *
	 * @returns {Promise<void>}
	 */
	async destroy() {
		clearInterval(this._revalidateTimer);
		for (const timer of this._expiryTimers.values()) clearTimeout(timer);
		this._expiryTimers.clear();
		this._unsubscribeSettings?.();
		this._removeUpgradeForwarder?.();
		this._socket.disconnectSockets(true);
		this.strapi.plugin(pluginId).service('subscriptions')?.untrack?.();
		// `_nsps` is what Socket.IO's own close() iterates; there is no public list.
		const namespaces = this._socket._nsps ? [...this._socket._nsps.values()] : [];
		await Promise.allSettled(namespaces.map((nsp) => nsp.adapter?.close?.()));
		this._socket.engine?.close?.();
	}

	/**
	 * Namespaces by name without the leading slash (`''` is the default one).
	 *
	 * @returns {Record<string, import('socket.io').Namespace>} Namespaces.
	 */
	get namespaces() {
		const entries = this._socket._nsps ? [...this._socket._nsps.entries()] : [];
		return Object.fromEntries(entries.map(([name, nsp]) => [name.replace(/^\//, ''), nsp]));
	}

	/** @returns {import('socket.io').Server} The Socket.IO server. */
	get server() {
		return this._socket;
	}
}

/**
 * Checks whether a room is managed by the plugin.
 *
 * @param {string} room - Room name.
 * @returns {boolean} True for role, token, admin and presence rooms.
 */
function isReservedRoom(room) {
	return (
		typeof room !== 'string' ||
		room.startsWith('io-role-') ||
		room.startsWith('io-token-') ||
		room.startsWith('io-admin-') ||
		room.startsWith('io-entity-') ||
		room.startsWith('presence:')
	);
}

export { isReservedRoom, SocketIO };
