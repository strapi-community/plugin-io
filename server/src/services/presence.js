import { randomBytes } from 'node:crypto';

const TOKEN_TTL_MS = 2 * 60 * 1000;
const CLEANUP_MS = 60 * 1000;
/** Unused tokens one admin may hold; issuing another drops the oldest. */
const MAX_TOKENS_PER_ADMIN = 5;
/** Unused tokens across all admins; above this the route answers 429. */
const MAX_TOKENS_TOTAL = 10_000;

/**
 * Presence session service: issues one-time tokens that let an authenticated
 * admin open a Socket.IO connection for Content Manager presence.
 *
 * A token stores only the admin's id, display name and Strapi session id.
 * The admin's permissions are loaded from the database when the token is
 * used, so an unused token never holds an ability object in memory.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Presence session API.
 */
export default ({ strapi: _strapi }) => {
	/** @type {Map<string, { user: { id: number, firstname: string | null, lastname: string | null }, sessionId: string | null, expiresAt: number }>} */
	const sessions = new Map();
	/** @type {Map<number | string, string[]>} Unused tokens per admin id, oldest first. */
	const byAdmin = new Map();
	let timer = null;

	const forget = (token) => {
		const session = sessions.get(token);
		if (!session) return;
		sessions.delete(token);
		const next = (byAdmin.get(session.user.id) ?? []).filter((t) => t !== token);
		if (next.length) byAdmin.set(session.user.id, next);
		else byAdmin.delete(session.user.id);
	};

	const sweep = () => {
		const now = Date.now();
		for (const [token, session] of sessions) {
			if (session.expiresAt < now) forget(token);
		}
	};

	return {
		/** Starts the expiry sweep (unref'd, so it never keeps the process alive). */
		start() {
			if (timer) return;
			timer = setInterval(sweep, CLEANUP_MS);
			timer.unref?.();
		},

		/** Stops the expiry sweep and forgets all tokens. */
		stop() {
			if (timer) clearInterval(timer);
			timer = null;
			sessions.clear();
			byAdmin.clear();
		},

		/**
		 * Creates a one-time token for an admin. One admin holds at most five
		 * unused tokens; a sixth drops the oldest.
		 *
		 * @param {{ id: number, firstname?: string, lastname?: string }} user - Admin user.
		 * @param {{ sessionId?: string | null }} [options] - Strapi admin session behind the request.
		 * @returns {{ token: string, expiresAt: number } | null} Token and expiry, or null when 10,000 tokens are pending.
		 */
		createSessionToken(user, { sessionId = null } = {}) {
			sweep();
			const own = [...(byAdmin.get(user.id) ?? [])];
			while (own.length >= MAX_TOKENS_PER_ADMIN) forget(own.shift());
			if (sessions.size >= MAX_TOKENS_TOTAL) return null;

			const token = randomBytes(32).toString('base64url');
			const expiresAt = Date.now() + TOKEN_TTL_MS;
			sessions.set(token, {
				user: { id: user.id, firstname: user.firstname ?? null, lastname: user.lastname ?? null },
				sessionId: typeof sessionId === 'string' && sessionId ? sessionId : null,
				expiresAt,
			});
			byAdmin.set(user.id, [...(byAdmin.get(user.id) ?? []), token]);
			return { token, expiresAt };
		},

		/**
		 * Validates and deletes a token (one-time use).
		 *
		 * @param {unknown} token - Token from the handshake.
		 * @returns {{ user: object, sessionId: string | null } | null} Session or null.
		 */
		consumeSessionToken(token) {
			if (typeof token !== 'string' || token.length > 128) return null;
			const session = sessions.get(token);
			if (!session) return null;
			forget(token);
			if (session.expiresAt < Date.now()) return null;
			return { user: session.user, sessionId: session.sessionId };
		},

		/**
		 * @param {number | string} [adminId] - Count only this admin's tokens.
		 * @returns {number} Number of unused tokens.
		 */
		size(adminId) {
			return adminId === undefined ? sessions.size : (byAdmin.get(adminId)?.length ?? 0);
		},
	};
};

export { MAX_TOKENS_PER_ADMIN, MAX_TOKENS_TOTAL, TOKEN_TTL_MS };
