import { errors } from '@strapi/utils';
import { API_TOKEN_TYPE, ROOM_PREFIX } from '../utils/constants.js';

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

	const admin = {
		name: 'io-admin',
		credentials(user) {
			return `${this.name}-${user.id}`;
		},
		/**
		 * Consumes a one-time admin session token.
		 *
		 * @param {{ token?: string }} auth - Handshake auth payload.
		 * @returns {Promise<{ user: object, ability: any }>} Admin session.
		 * @throws {UnauthorizedError} When the token is missing, used or expired.
		 */
		async authenticate(auth) {
			const session = strapi.plugin('io').service('presence').consumeSessionToken(auth?.token);
			if (!session) fail();
			return session;
		},
		/**
		 * Re-checks that the admin account is still active.
		 *
		 * @param {import('socket.io').Socket} socket - Connected admin socket.
		 * @returns {Promise<boolean>} False when the socket must be disconnected.
		 */
		async revalidate(socket) {
			const id = socket.data.user?.id;
			if (!id) return false;
			const user = await strapi.db
				.query('admin::user')
				.findOne({ where: { id }, select: ['id', 'isActive', 'blocked'] });
			return Boolean(user && user.isActive !== false && user.blocked !== true);
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
		 * Verifies a Users & Permissions JWT (legacy and refresh mode) the same way
		 * the core users-permissions strategy does.
		 *
		 * @param {{ token?: string }} auth - Handshake auth payload.
		 * @returns {Promise<{ user: { id: number }, role: { id: number, name: string, type: string }, expiresAt: number | null }>} Identity.
		 * @throws {UnauthorizedError} On any verification failure.
		 */
		async authenticate(auth) {
			const jwtService = upService('jwt');
			const userService = upService('user');
			if (!jwtService || !userService) fail();
			if (typeof auth?.token !== 'string' || auth.token.length > MAX_TOKEN_LENGTH) fail();

			let payload;
			try {
				payload = await jwtService.verify(auth.token);
			} catch {
				fail();
			}
			if (!payload || payload.id === undefined) fail();

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
				expiresAt: typeof payload.exp === 'number' ? payload.exp * 1000 : null,
			};
		},
		/**
		 * Re-runs authentication with the socket's original token and checks that
		 * the role did not change.
		 *
		 * @param {import('socket.io').Socket} socket - Connected socket.
		 * @returns {Promise<boolean>} False when the socket must be disconnected.
		 */
		async revalidate(socket) {
			try {
				const identity = await this.authenticate(socket.handshake.auth);
				return identity.role.id === socket.data.role?.id;
			} catch {
				return false;
			}
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
		 * Re-checks that the token still exists and has not expired.
		 *
		 * @param {import('socket.io').Socket} socket - Connected socket.
		 * @returns {Promise<boolean>} False when the socket must be disconnected.
		 */
		async revalidate(socket) {
			const id = socket.data.token?.id;
			if (!id) return false;
			const apiToken = await strapi.db
				.query('admin::api-token')
				.findOne({ where: { id }, select: ['id', 'expiresAt'] });
			return Boolean(apiToken && (!apiToken.expiresAt || new Date(apiToken.expiresAt) >= new Date()));
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
