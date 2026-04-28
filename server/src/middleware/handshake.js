import { getService } from '../utils/getService.js';

/**
 * In-memory rate-limiter for socket handshakes. Limits authentication attempts
 * per remote address over a sliding window so attackers cannot brute-force
 * tokens through the Socket.IO handshake.
 */
const MAX_FAILED_ATTEMPTS = 20;
const WINDOW_MS = 60 * 1000;
const failedAttempts = new Map();

/**
 * Extracts a best-effort remote address from a socket handshake. Respects
 * X-Forwarded-For only when explicitly trusted via env; otherwise uses the
 * raw socket address to avoid trivial spoofing.
 *
 * @param {import('socket.io').Socket} socket
 * @returns {string}
 */
function getRemoteAddress(socket) {
	const trustProxy = process.env.TRUST_PROXY === 'true';
	if (trustProxy) {
		const xff = socket.handshake?.headers?.['x-forwarded-for'];
		if (typeof xff === 'string' && xff.length > 0) {
			return xff.split(',')[0].trim();
		}
	}
	return socket.handshake?.address || 'unknown';
}

/**
 * Records a failed auth attempt and returns true when the address exceeds the
 * failure budget within the sliding window.
 *
 * @param {string} address
 * @returns {boolean} true when the address should be blocked
 */
function recordFailure(address) {
	const now = Date.now();
	let entry = failedAttempts.get(address);
	if (!entry || now - entry.firstAt > WINDOW_MS) {
		entry = { count: 0, firstAt: now };
	}
	entry.count += 1;
	failedAttempts.set(address, entry);

	if (failedAttempts.size > 50_000) {
		const cutoff = now - WINDOW_MS;
		for (const [key, value] of failedAttempts.entries()) {
			if (value.firstAt < cutoff) failedAttempts.delete(key);
		}
	}

	return entry.count > MAX_FAILED_ATTEMPTS;
}

/**
 * Clears failures for an address after a successful handshake.
 * @param {string} address
 */
function clearFailures(address) {
	failedAttempts.delete(address);
}

/**
 * Auto assigns sockets to appropriate rooms based on tokens associated name.
 * Defaults to default role if no token provided.
 *
 * Rate-limits authentication attempts per remote address to prevent
 * brute-force attacks against JWT/API-token/session-token strategies.
 *
 * @param {import('socket.io').Socket} socket
 * @param {Function} next
 */
async function handshake(socket, next) {
	const strategyService = getService({ name: 'strategy' });
	const auth = socket.handshake.auth || {};
	let strategy = auth.strategy || 'jwt';
	const token = typeof auth.token === 'string' ? auth.token : '';
	const remoteAddress = getRemoteAddress(socket);

	const existing = failedAttempts.get(remoteAddress);
	if (existing && existing.count > MAX_FAILED_ATTEMPTS && Date.now() - existing.firstAt < WINDOW_MS) {
		return next(new Error('Too many authentication attempts. Try again later.'));
	}

	if (!token.length) {
		strategy = '';
	}

	try {
		let room;
		if (strategy && strategy.length) {
			let strategyType;
			if (strategy === 'jwt') {
				strategyType = 'role';
			} else if (strategy === 'admin-jwt') {
				strategyType = 'admin';
			} else {
				strategyType = 'token';
			}

			const ctx = await strategyService[strategyType].authenticate(auth);
			room = strategyService[strategyType].getRoomName(ctx);

			if (strategyType === 'admin') {
				socket.data.user = ctx;
			} else if (strategyType === 'role' && ctx) {
				socket.data.user = { role: ctx };
			}
		} else if (strapi.plugin('users-permissions')) {
			const role = await strapi.documents('plugin::users-permissions.role').findFirst({
				filters: { type: 'public' },
				fields: ['id', 'name'],
			});

			room = strategyService['role'].getRoomName(role);
		}

		if (room) {
			socket.join(room.replace(/\s+/g, '-'));
		} else {
			throw new Error('No valid room found');
		}

		clearFailures(remoteAddress);
		next();
	} catch (error) {
		const blocked = recordFailure(remoteAddress);
		if (blocked) {
			return next(new Error('Too many authentication attempts. Try again later.'));
		}
		next(new Error(error.message));
	}
}

export { handshake };
