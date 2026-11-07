import { getClientIp } from '../utils/client-ip.js';
import { createIpRules } from '../utils/ip-rules.js';
import { createFailureLimiter } from '../services/rate-limit.js';

/** Strategy names a client may send in `auth.strategy`. */
const STRATEGY_TYPES = Object.freeze({
	jwt: 'role',
	'api-token': 'token',
	apiToken: 'token',
	token: 'token',
	'admin-jwt': 'admin',
});

const MESSAGES = Object.freeze({
	AUTH_FAILED: 'Authentication failed',
	AUTH_REQUIRED: 'Authentication required',
	NOT_ALLOWED: 'Connection not allowed',
	TOO_MANY: 'Too many authentication attempts. Try again later.',
	FULL: 'Server is at capacity. Try again later.',
});

/**
 * Creates the Socket.IO handshake middleware. It applies, in order: the
 * failed-attempt lockout, IP rules, the connection cap, authentication
 * (JWT, API token, admin session or public role), the role's "allow
 * connection" setting, and finally joins the socket to its audience room.
 * Clients only ever see generic error messages.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {(socket: import('socket.io').Socket, next: (err?: Error) => void) => Promise<void>} Middleware.
 * @see https://socket.io/docs/v4/middlewares/
 */
function createHandshake({ strapi }) {
	const failures = createFailureLimiter();
	let ipRulesFor = null;
	let ipRules = () => true;

	const settingsService = () => strapi.plugin('io').service('settings');
	const strategies = () => strapi.plugin('io').service('strategy');

	/** Rebuilds the IP rule checker when the security settings object changes. */
	const currentIpRules = (security) => {
		if (ipRulesFor !== security) {
			ipRules = createIpRules(security);
			ipRulesFor = security;
		}
		return ipRules;
	};

	let publicRole = null;
	let publicRoleAt = 0;
	/** Loads the public role, cached for 30 s. */
	const getPublicRole = async () => {
		if (publicRole && Date.now() - publicRoleAt < 30_000) return publicRole;
		publicRole = await strapi.db
			.query('plugin::users-permissions.role')
			.findOne({ where: { type: 'public' }, select: ['id', 'name', 'type'] });
		publicRoleAt = Date.now();
		return publicRole;
	};

	const handshake = async (socket, next) => {
		const settings = settingsService().current();
		const ip = getClientIp(socket.request, strapi.server?.app);
		socket.data.clientIp = ip;

		if (failures.isBlocked(ip)) return next(new Error(MESSAGES.TOO_MANY));
		if (!currentIpRules(settings.security)(ip)) return next(new Error(MESSAGES.NOT_ALLOWED));

		const max = settings.connection.maxConnections;
		const engineCount = socket.nsp?.server?.engine?.clientsCount ?? 0;
		if (max > 0 && engineCount > max) return next(new Error(MESSAGES.FULL));

		const auth = socket.handshake.auth && typeof socket.handshake.auth === 'object' ? socket.handshake.auth : {};
		const token = typeof auth.token === 'string' ? auth.token : '';
		const strategyName = typeof auth.strategy === 'string' && auth.strategy ? auth.strategy : 'jwt';

		try {
			if (!token) {
				if (settings.security.requireAuthentication) return next(new Error(MESSAGES.AUTH_REQUIRED));
				socket.data.kind = 'public';
				if (strapi.plugin('users-permissions')) {
					const role = await getPublicRole();
					if (role) {
						if (settings.rolePermissions?.[role.type]?.canConnect === false) {
							return next(new Error(MESSAGES.NOT_ALLOWED));
						}
						socket.data.role = role;
						socket.join(strategies().role.getRoomName(role));
					}
				}
				return next();
			}

			const type = STRATEGY_TYPES[strategyName];
			if (!type) throw new Error('unknown strategy');
			const strategy = strategies()[type];
			const identity = await strategy.authenticate(auth);

			if (type === 'admin') {
				socket.data.kind = 'admin';
				socket.data.user = identity.user;
				socket.data.adminAbility = identity.ability;
				socket.join(strategy.getRoomName(identity.user));
			} else if (type === 'role') {
				if (settings.rolePermissions?.[identity.role.type]?.canConnect === false) {
					return next(new Error(MESSAGES.NOT_ALLOWED));
				}
				socket.data.kind = 'user';
				socket.data.user = { id: identity.user.id, role: identity.role };
				socket.data.role = identity.role;
				socket.data.expiresAt = identity.expiresAt;
				socket.join(strategy.getRoomName(identity.role));
			} else {
				socket.data.kind = 'token';
				socket.data.token = { id: identity.id, type: identity.type };
				socket.data.expiresAt = identity.expiresAt ? Date.parse(identity.expiresAt) : null;
				socket.join(strategy.getRoomName(identity));
			}

			failures.clear(ip);
			return next();
		} catch (error) {
			if (error?.name !== 'UnauthorizedError' && error?.message !== 'unknown strategy') {
				strapi.log.error(`[io] Handshake error: ${error?.name || 'Error'}`);
			}
			failures.fail(ip);
			return next(new Error(failures.isBlocked(ip) ? MESSAGES.TOO_MANY : MESSAGES.AUTH_FAILED));
		}
	};

	handshake.failures = failures;
	return handshake;
}

export { createHandshake, MESSAGES, STRATEGY_TYPES };
