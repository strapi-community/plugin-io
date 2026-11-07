import { sha256 } from '../cluster/store.js';
import { getClientIp } from '../utils/client-ip.js';
import { createIpRules } from '../utils/ip-rules.js';
import { setPrivate } from '../utils/socket-private.js';
import { createSharedFailureLimiter } from '../services/rate-limit.js';

/**
 * Unknown or used admin presence tokens per IP and minute before presence
 * handshakes from that IP are refused. Kept apart from the general lockout:
 * with several processes a presence token can be retried after a restart or
 * deploy, and several admins behind one office NAT must not lock out every
 * other client of that IP.
 */
const PRESENCE_MISSES_PER_MINUTE = 120;

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
 * failed-attempt lockout (shared by all processes when coordination is on),
 * IP rules, the connection cap (a total across processes when coordination
 * is on, from their last heartbeat), authentication
 * (JWT, API token, admin session or public role), the role's "allow
 * connection" setting, and finally joins the socket to its audience room.
 * Clients only ever see generic error messages.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {(socket: import('socket.io').Socket, next: (err?: Error) => void) => Promise<void>} Middleware.
 * @see https://socket.io/docs/v4/middlewares/
 */
function createHandshake({ strapi }) {
	const cluster = () => strapi.plugin('io').service('cluster');
	const sharedStore = () => (cluster()?.isCoordinated?.() ? cluster().store() : null);
	const failures = createSharedFailureLimiter({ store: sharedStore, key: (ip) => `hs:${sha256(ip)}` });
	const presenceMisses = createSharedFailureLimiter({
		store: sharedStore,
		key: (ip) => `ps:${sha256(ip)}`,
		maxFailures: PRESENCE_MISSES_PER_MINUTE,
	});
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
		setPrivate(socket, 'clientIp', ip);

		if (failures.isBlocked(ip)) return next(new Error(MESSAGES.TOO_MANY));
		if (!currentIpRules(settings.security)(ip)) return next(new Error(MESSAGES.NOT_ALLOWED));

		const max = settings.connection.maxConnections;
		const engineCount = socket.nsp?.server?.engine?.clientsCount ?? 0;
		const elsewhere = max > 0 ? (cluster()?.connectionsElsewhere?.() ?? 0) : 0;
		if (max > 0 && engineCount + elsewhere > max) return next(new Error(MESSAGES.FULL));

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
			if (type === 'admin' && presenceMisses.isBlocked(ip)) return next(new Error(MESSAGES.TOO_MANY));
			const strategy = strategies()[type];
			const identity = await strategy.authenticate(auth);

			if (type === 'admin') {
				// Admin identity lives under `data.admin`, never `data.user`, so
				// handlers written for Users & Permissions ids cannot mix them up.
				socket.data.kind = 'admin';
				socket.data.admin = identity.user;
				setPrivate(socket, 'adminAbility', identity.ability);
				socket.data.adminSessionId = identity.sessionId ?? null;
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
			if (type === 'admin') presenceMisses.clear(ip);
			return next();
		} catch (error) {
			if (error?.name !== 'UnauthorizedError' && error?.message !== 'unknown strategy') {
				strapi.log.error(`[io] Handshake error: ${error?.name || 'Error'}`);
			}
			// An unknown or used presence token is not a guessed credential (the
			// tokens are 256-bit); it counts in its own, wider limit.
			const limiter = STRATEGY_TYPES[strategyName] === 'admin' ? presenceMisses : failures;
			const blocked = await limiter.fail(ip);
			return next(new Error(blocked ? MESSAGES.TOO_MANY : MESSAGES.AUTH_FAILED));
		}
	};

	handshake.failures = failures;
	handshake.presenceMisses = presenceMisses;
	return handshake;
}

export { createHandshake, MESSAGES, STRATEGY_TYPES };
