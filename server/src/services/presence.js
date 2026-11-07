import { randomBytes } from 'node:crypto';

const TOKEN_TTL_MS = 2 * 60 * 1000;
const CLEANUP_MS = 60 * 1000;

/**
 * Presence session service: issues one-time tokens that let an authenticated
 * admin open a Socket.IO connection for Content Manager presence.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Presence session API.
 */
export default ({ strapi: _strapi }) => {
	const sessions = new Map();
	let timer = null;

	const sweep = () => {
		const now = Date.now();
		for (const [token, session] of sessions) {
			if (session.expiresAt < now) sessions.delete(token);
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
		},

		/**
		 * Creates a one-time token for an admin.
		 *
		 * @param {{ id: number, firstname?: string, lastname?: string }} user - Admin user.
		 * @param {any} ability - The admin's CASL ability from the request.
		 * @returns {{ token: string, expiresAt: number }} Token and expiry.
		 */
		createSessionToken(user, ability) {
			sweep();
			const token = randomBytes(32).toString('base64url');
			const expiresAt = Date.now() + TOKEN_TTL_MS;
			sessions.set(token, {
				user: { id: user.id, firstname: user.firstname ?? null, lastname: user.lastname ?? null },
				ability,
				expiresAt,
			});
			return { token, expiresAt };
		},

		/**
		 * Validates and deletes a token (one-time use).
		 *
		 * @param {unknown} token - Token from the handshake.
		 * @returns {{ user: object, ability: any } | null} Session or null.
		 */
		consumeSessionToken(token) {
			if (typeof token !== 'string' || token.length > 128) return null;
			const session = sessions.get(token);
			if (!session) return null;
			sessions.delete(token);
			if (session.expiresAt < Date.now()) return null;
			return { user: session.user, ability: session.ability };
		},

		/** @returns {number} Number of unused tokens (for tests). */
		size() {
			return sessions.size;
		},
	};
};
