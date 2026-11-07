import { errors } from '@strapi/utils';
import { API_TOKEN_TYPE, ROOM_PREFIX } from '../utils/constants.js';
import { setPrivate } from '../utils/socket-private.js';

const { UnauthorizedError, ForbiddenError } = errors;

const MAX_TOKEN_LENGTH = 4096;
const HOUR_MS = 60 * 60 * 1000;

const castArray = (value) => (Array.isArray(value) ? value : [value]);
const isReadScope = (scope) => scope.endsWith('.find') || scope.endsWith('.findOne');
const toAction = (permission) => (typeof permission === 'string' ? permission : permission?.action);

/**
 * Throws the single, generic error the handshake reports to clients.
 *
 * @returns {never} Never returns.
 * @throws {UnauthorizedError} Always.
 */
function fail() {
	throw new UnauthorizedError('Invalid credentials');
}

/**
 * Authentication strategies for socket handshakes and the room model used to
 * deliver content events:
 * - `role`: Users & Permissions JWT, room `io-role-<role type>`
 * - `token`: content API token, room `io-token-<token id>`
 * - `admin`: one-time admin session token from `POST /io/presence/session`,
 *   room `io-admin-<admin id>` (never receives content events)
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {{ admin: object, role: object, token: object }} Strategies.
 */
export default ({ strapi }) => {
	const upService = (name) => strapi.plugin('users-permissions')?.service(name);

	/**
	 * Resolves the content API token service across Strapi 5 minors
	 * (`api-token-content-api` since 5.5x, `api-token` before).
	 *
	 * @returns {any} Token service.
	 */
	const tokenService = () => {
		try {
			return strapi.service('admin::api-token-content-api') || strapi.service('admin::api-token');
		} catch {
			return strapi.service('admin::api-token');
		}
	};

	/**
	 * Admin session manager (`strapi.sessionManager('admin')`), or null on
	 * Strapi versions without session management.
	 *
	 * @param {string} origin - Session origin (`admin` or `users-permissions`).
	 * @returns {any} Origin session manager or null.
	 */
	const sessions = (origin) => {
		try {
			return typeof strapi.sessionManager === 'function' ? strapi.sessionManager(origin) : null;
		} catch {
			return null;
		}
	};

	/**
	 * Checks a batch of Strapi session ids, one query per distinct id.
	 *
	 * @param {string} origin - Session origin.
	 * @param {Iterable<string | null | undefined>} ids - Session ids.
	 * @returns {Promise<Map<string, boolean>>} Active state per session id.
	 */
	const activeSessions = async (origin, ids) => {
		const manager = sessions(origin);
		const result = new Map();
		for (const id of new Set([...ids].filter(Boolean))) {
			try {
				result.set(id, manager ? await manager.isSessionActive(id) : true);
			} catch {
				result.set(id, false);
			}
		}
		return result;
	};

	/**
	 * Loads active admins with their roles and builds a fresh admin ability
	 * for each (one query for the users, then one permission lookup per admin).
	 *
	 * @param {Iterable<number | string>} ids - Admin ids.
	 * @returns {Promise<Map<string, { user: object, ability: any }>>} Admin and ability by id.
	 */
	const loadAdmins = async (ids) => {
		const unique = [...new Set([...ids].filter((id) => id !== undefined && id !== null))];
		const result = new Map();
		if (!unique.length) return result;
		const users = await strapi.db.query('admin::user').findMany({
			where: { id: { $in: unique } },
			select: ['id', 'firstname', 'lastname', 'isActive', 'blocked'],
			populate: { roles: { select: ['id', 'code'] } },
		});
		const engine = strapi.service('admin::permission')?.engine;
		for (const user of users) {
			if (user.isActive === false || user.blocked === true) continue;
			const ability = engine ? await engine.generateUserAbility(user) : null;
			if (ability) result.set(String(user.id), { user, ability });
		}
		return result;
	};

	/**
	 * Reads `exp` from a JWT that was already verified. Refresh-mode
	 * `jwtService.verify` returns only `{ id, sessionId }`, so the expiry is
	 * taken from the token itself.
	 *
	 * @param {string} token - Verified JWT.
	 * @returns {number | null} Expiry in ms, or null.
	 */
	const readExpiry = (token) => {
		try {
			const exp = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).exp;
			return typeof exp === 'number' ? exp * 1000 : null;
		} catch {
			return null;
		}
	};

	/**
	 * Verifies a Users & Permissions token with the plugin's own jwt service.
	 *
	 * @param {unknown} token - Token from the handshake.
	 * @returns {Promise<{ id: number | string, sessionId: string | null, expiresAt: number | null }>} Payload.
	 * @throws {UnauthorizedError} When the token is missing, too long or invalid.
	 */
	const verifyJwt = async (token) => {
		const jwtService = upService('jwt');
		if (!jwtService || typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) fail();
		let payload;
		try {
			const manager = sessions('users-permissions');
			if (strapi.config.get('plugin::users-permissions.jwtManagement') === 'refresh' && manager?.validateAccessToken) {
				// Same check as the core jwt service in refresh mode, without its
				// per-call user query (the user is loaded once afterwards).
				const result = manager.validateAccessToken(token);
				if (!result?.isValid || result.payload?.type !== 'access') fail();
				const raw = result.payload.userId;
				payload = { id: Number(raw) || raw, sessionId: result.payload.sessionId };
			} else {
				payload = await jwtService.verify(token);
			}
		} catch {
			fail();
		}
		if (!payload || payload.id === undefined) fail();
		return {
			id: payload.id,
			sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : null,
			expiresAt: typeof payload.exp === 'number' ? payload.exp * 1000 : readExpiry(token),
		};
	};

	const admin = {
		name: 'io-admin',
		credentials(user) {
			return `${this.name}-${user.id}`;
		},
		/**
		 * Consumes a one-time admin session token, checks that the admin account
		 * and its Strapi session are still active, and builds the admin's
		 * current ability from the database.
		 *
		 * @param {{ token?: string }} auth - Handshake auth payload.
		 * @returns {Promise<{ user: { id: number, firstname: string | null, lastname: string | null }, ability: any, sessionId: string | null }>} Admin session.
		 * @throws {UnauthorizedError} When the token is missing, used or expired, or the admin or session is no longer active.
		 */
		async authenticate(auth) {
			const session = await strapi.plugin('io').service('presence').consumeSessionToken(auth?.token);
			if (!session) fail();
			if (session.sessionId && !(await activeSessions('admin', [session.sessionId])).get(session.sessionId)) fail();
			const loaded = (await loadAdmins([session.user.id])).get(String(session.user.id));
			if (!loaded) fail();
			return { user: session.user, ability: loaded.ability, sessionId: session.sessionId };
		},
		/**
		 * Re-checks admin sockets in one batch: the account must be active, the
		 * Strapi session must still exist (logout ends it), and the admin must
		 * still be allowed to read every document whose presence room the socket
		 * joined. Surviving sockets get the admin's current ability.
		 *
		 * @param {import('socket.io').Socket[]} sockets - Connected admin sockets.
		 * @returns {Promise<Set<string>>} Ids of the sockets to disconnect.
		 */
		async revalidateMany(sockets) {
			const failed = new Set();
			const admins = await loadAdmins(sockets.map((s) => s.data.admin?.id));
			const active = await activeSessions(
				'admin',
				sockets.map((s) => s.data.adminSessionId)
			);
			for (const socket of sockets) {
				const loaded = admins.get(String(socket.data.admin?.id));
				const sessionId = socket.data.adminSessionId;
				if (!loaded || (sessionId && !active.get(sessionId))) {
					failed.add(socket.id);
					continue;
				}
				const editing = socket.data.editing || [];
				if (editing.some((entry) => !loaded.ability.can('plugin::content-manager.explorer.read', entry.uid))) {
					failed.add(socket.id);
					continue;
				}
				setPrivate(socket, 'adminAbility', loaded.ability);
			}
			return failed;
		},
		/**
		 * Re-checks one admin socket.
		 *
		 * @param {import('socket.io').Socket} socket - Connected admin socket.
		 * @returns {Promise<boolean>} False when the socket must be disconnected.
		 */
		async revalidate(socket) {
			return !(await this.revalidateMany([socket])).has(socket.id);
		},
		getRoomName(user) {
			return `${ROOM_PREFIX.ADMIN}${user.id}`;
		},
	};

	const role = {
		name: 'io-role',
		credentials(roleEntry) {
			return `${this.name}-${roleEntry.id}`;
		},
		/**
		 * Verifies a Users & Permissions JWT the same way the core
		 * users-permissions strategy does, in legacy and refresh mode. In
		 * refresh mode the Strapi session behind the access token must also
		 * still exist, so a logout or revoked session cannot reconnect.
		 *
		 * @param {{ token?: string }} auth - Handshake auth payload.
		 * @returns {Promise<{ user: { id: number }, role: { id: number, name: string, type: string }, expiresAt: number | null, sessionId: string | null }>} Identity.
		 * @throws {UnauthorizedError} On any verification failure.
		 */
		async authenticate(auth) {
			const userService = upService('user');
			if (!upService('jwt') || !userService) fail();
			const payload = await verifyJwt(auth?.token);
			if (
				payload.sessionId &&
				!(await activeSessions('users-permissions', [payload.sessionId])).get(payload.sessionId)
			) {
				fail();
			}

			const user = await userService.fetchAuthenticatedUser(payload.id);
			if (!user || user.blocked) fail();
			const advanced = await strapi.store({ type: 'plugin', name: 'users-permissions' }).get({ key: 'advanced' });
			if (advanced?.email_confirmation && !user.confirmed) fail();
			if (!user.role?.id) fail();

			const roleEntry = await strapi.db
				.query('plugin::users-permissions.role')
				.findOne({ where: { id: user.role.id }, select: ['id', 'name', 'type'] });
			if (!roleEntry) fail();

			return {
				user: { id: user.id },
				role: roleEntry,
				expiresAt: payload.expiresAt,
				sessionId: payload.sessionId,
			};
		},
		/**
		 * Re-checks user sockets in one batch: each token must still verify, its
		 * refresh-mode session must exist, and the user must still be
		 * unblocked, confirmed (when required) and in the same role. Uses one
		 * user query, one store read and one query per distinct session.
		 *
		 * @param {import('socket.io').Socket[]} sockets - Connected user sockets.
		 * @returns {Promise<Set<string>>} Ids of the sockets to disconnect.
		 */
		async revalidateMany(sockets) {
			const failed = new Set();
			const verified = new Map();
			for (const socket of sockets) {
				try {
					verified.set(socket.id, await verifyJwt(socket.handshake.auth?.token));
				} catch {
					failed.add(socket.id);
				}
			}
			const ids = [...new Set([...verified.values()].map((p) => p.id))];
			const users = ids.length
				? await strapi.db.query('plugin::users-permissions.user').findMany({
						where: { id: { $in: ids } },
						select: ['id', 'blocked', 'confirmed'],
						populate: { role: { select: ['id'] } },
					})
				: [];
			const byId = new Map(users.map((u) => [String(u.id), u]));
			const advanced = ids.length
				? await strapi.store({ type: 'plugin', name: 'users-permissions' }).get({ key: 'advanced' })
				: null;
			const active = await activeSessions(
				'users-permissions',
				[...verified.values()].map((p) => p.sessionId)
			);
			for (const socket of sockets) {
				const payload = verified.get(socket.id);
				if (!payload) continue;
				const user = byId.get(String(payload.id));
				const ok =
					user &&
					!user.blocked &&
					!(advanced?.email_confirmation && !user.confirmed) &&
					user.role?.id === socket.data.role?.id &&
					(!payload.sessionId || active.get(payload.sessionId));
				if (!ok) failed.add(socket.id);
			}
			return failed;
		},
		/**
		 * Re-checks one user socket.
		 *
		 * @param {import('socket.io').Socket} socket - Connected socket.
		 * @returns {Promise<boolean>} False when the socket must be disconnected.
		 */
		async revalidate(socket) {
			return !(await this.revalidateMany([socket])).has(socket.id);
		},
		/**
		 * Content API `verify` used by the sanitizer for this audience.
		 *
		 * @param {{ ability?: any }} auth - Sanitizer auth.
		 * @param {{ scope?: string | string[] }} config - Required scope.
		 * @throws {UnauthorizedError | ForbiddenError} When not allowed.
		 */
		verify(auth, config) {
			if (!auth?.ability) throw new UnauthorizedError();
			if (!castArray(config.scope).every((scope) => auth.ability.can(scope))) throw new ForbiddenError();
		},
		getRoomName(roleEntry) {
			return `${ROOM_PREFIX.ROLE}${roleEntry.type}`;
		},
		/**
		 * Loads every role with its permission actions.
		 *
		 * @returns {Promise<Array<{ id: number, name: string, type: string, permissions: Array<{ action: string }> }>>} Roles.
		 */
		async getRooms() {
			if (!strapi.plugin('users-permissions')) return [];
			return strapi.db.query('plugin::users-permissions.role').findMany({
				select: ['id', 'name', 'type'],
				populate: { permissions: { select: ['action'] } },
			});
		},
	};

	const token = {
		name: 'io-token',
		credentials(apiToken) {
			return apiToken;
		},
		/**
		 * Verifies a content API token like Strapi's `content-api-token` strategy:
		 * admin-kind tokens are rejected, expiry is checked, and `lastUsedAt` is
		 * updated at most once an hour.
		 *
		 * @param {{ token?: string }} auth - Handshake auth payload.
		 * @returns {Promise<object>} The token (id, name, type, expiresAt, permissions).
		 * @throws {UnauthorizedError} On any verification failure.
		 */
		async authenticate(auth) {
			if (typeof auth?.token !== 'string' || !auth.token || auth.token.length > MAX_TOKEN_LENGTH) fail();
			const service = tokenService();
			const accessKey = service.hash(auth.token);
			const apiToken = service.getByAccessKey
				? await service.getByAccessKey(accessKey)
				: await service.getBy({ accessKey });
			if (!apiToken) fail();
			if (apiToken.kind !== undefined && apiToken.kind !== null && apiToken.kind !== 'content-api') fail();
			if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) fail();

			const lastUsed = apiToken.lastUsedAt ? Date.parse(apiToken.lastUsedAt) : NaN;
			if (Number.isNaN(lastUsed) || Date.now() - lastUsed >= HOUR_MS) {
				await strapi.db
					.query('admin::api-token')
					.update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } });
			}
			return apiToken;
		},
		/**
		 * Re-checks token sockets with one query: the token must still exist
		 * and must not have expired.
		 *
		 * @param {import('socket.io').Socket[]} sockets - Connected token sockets.
		 * @returns {Promise<Set<string>>} Ids of the sockets to disconnect.
		 */
		async revalidateMany(sockets) {
			const ids = [...new Set(sockets.map((s) => s.data.token?.id).filter((id) => id !== undefined))];
			const rows = ids.length
				? await strapi.db
						.query('admin::api-token')
						.findMany({ where: { id: { $in: ids } }, select: ['id', 'expiresAt'] })
				: [];
			const now = new Date();
			const valid = new Set(rows.filter((t) => !t.expiresAt || new Date(t.expiresAt) >= now).map((t) => String(t.id)));
			return new Set(sockets.filter((s) => !valid.has(String(s.data.token?.id))).map((s) => s.id));
		},
		/**
		 * Re-checks one token socket.
		 *
		 * @param {import('socket.io').Socket} socket - Connected socket.
		 * @returns {Promise<boolean>} False when the socket must be disconnected.
		 */
		async revalidate(socket) {
			return !(await this.revalidateMany([socket])).has(socket.id);
		},
		/**
		 * Content API `verify` used by the sanitizer for this audience.
		 *
		 * @param {{ credentials?: object, ability?: any }} auth - Sanitizer auth.
		 * @param {{ scope?: string | string[] }} config - Required scope.
		 * @throws {UnauthorizedError | ForbiddenError} When not allowed.
		 */
		verify(auth, config) {
			const { credentials: apiToken, ability } = auth || {};
			if (!apiToken) throw new UnauthorizedError('Token not found');
			if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
				throw new UnauthorizedError('Token expired');
			}
			if (apiToken.type === API_TOKEN_TYPE.FULL_ACCESS) return;
			const scopes = castArray(config.scope);
			if (apiToken.type === API_TOKEN_TYPE.READ_ONLY && config.scope && scopes.every(isReadScope)) return;
			if (apiToken.type === API_TOKEN_TYPE.CUSTOM && ability && scopes.every((s) => ability.can(s))) return;
			throw new ForbiddenError();
		},
		getRoomName(apiToken) {
			return `${ROOM_PREFIX.TOKEN}${apiToken.id}`;
		},
		/**
		 * Loads every non-expired content API token with its permission actions.
		 *
		 * @returns {Promise<Array<object>>} Tokens.
		 */
		async getRooms() {
			const model = strapi.getModel?.('admin::api-token');
			const hasKind = Boolean(model?.attributes?.kind);
			const tokens = await strapi.db.query('admin::api-token').findMany({
				select: ['id', 'type', 'name', 'expiresAt', ...(hasKind ? ['kind'] : [])],
				where: { $or: [{ expiresAt: { $gte: new Date() } }, { expiresAt: null }] },
				populate: { permissions: { select: ['action'] } },
			});
			return tokens.filter((t) => !hasKind || t.kind === null || t.kind === undefined || t.kind === 'content-api');
		},
	};

	return { admin, role, token };
};

export { isReadScope, toAction };
