import { randomBytes } from 'node:crypto';
import { sha256 } from '../cluster/store.js';

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
 * used, so an unused token never holds an ability object.
 *
 * With several processes the token is issued on one process and used on
 * another, so tokens live in the cluster store: in memory for one process,
 * in the `plugin_io_presence_tokens` table otherwise. Only a SHA-256 hash of
 * the token is stored, and using it is a single DELETE whose row count
 * decides who wins, so a token works exactly once across all processes.
 * The caps are `count()` queries and may be exceeded by a few tokens under
 * concurrent requests.
 *
 * @param {{ strapi: import('@strapi/types').Core.Strapi }} deps - Strapi instance.
 * @returns {object} Presence session API.
 */
export default ({ strapi }) => {
	let timer = null;
	const store = () => strapi.plugin('io').service('cluster').store();

	const sweep = () =>
		store()
			.sweepTokens(Date.now())
			.catch(() => {});

	return {
		/** Starts the expiry sweep (unref'd, so it never keeps the process alive). Idempotent across processes. */
		start() {
			if (timer) return;
			timer = setInterval(sweep, CLEANUP_MS);
			timer.unref?.();
		},

		/** Stops the expiry sweep. */
		stop() {
			if (timer) clearInterval(timer);
			timer = null;
		},

		/**
		 * Creates a one-time token for an admin. One admin holds at most five
		 * unused tokens; a sixth drops the oldest.
		 *
		 * @param {{ id: number, firstname?: string, lastname?: string }} user - Admin user.
		 * @param {{ sessionId?: string | null }} [options] - Strapi admin session behind the request.
		 * @returns {Promise<{ token: string, expiresAt: number } | null>} Token and expiry, or null when 10,000 tokens are pending.
		 */
		async createSessionToken(user, { sessionId = null } = {}) {
			const now = Date.now();
			const adminId = String(user.id);
			await store().trimAdminTokens(adminId, MAX_TOKENS_PER_ADMIN - 1);
			if ((await store().countTokens(now)) >= MAX_TOKENS_TOTAL) {
				await store().sweepTokens(now);
				if ((await store().countTokens(now)) >= MAX_TOKENS_TOTAL) return null;
			}
			const token = randomBytes(32).toString('base64url');
			const expiresAt = now + TOKEN_TTL_MS;
			await store().putToken(sha256(token), {
				adminId,
				firstname: user.firstname ?? null,
				lastname: user.lastname ?? null,
				sessionId: typeof sessionId === 'string' && sessionId ? sessionId.slice(0, 255) : null,
				expiresAt,
				createdAt: now,
			});
			return { token, expiresAt };
		},

		/**
		 * Validates and deletes a token (one-time use, on any process).
		 *
		 * @param {unknown} token - Token from the handshake.
		 * @returns {Promise<{ user: { id: number | string, firstname: string | null, lastname: string | null }, sessionId: string | null } | null>} Session or null.
		 */
		async consumeSessionToken(token) {
			if (typeof token !== 'string' || !token || token.length > 128) return null;
			const row = await store().takeToken(sha256(token), Date.now());
			if (!row) return null;
			const numeric = Number(row.adminId);
			return {
				user: {
					id: Number.isSafeInteger(numeric) && String(numeric) === row.adminId ? numeric : row.adminId,
					firstname: row.firstname,
					lastname: row.lastname,
				},
				sessionId: row.sessionId,
			};
		},

		/**
		 * @param {number | string} [adminId] - Count only this admin's tokens.
		 * @returns {Promise<number>} Number of unused, unexpired tokens.
		 */
		async size(adminId) {
			return store().countTokens(Date.now(), adminId === undefined ? undefined : String(adminId));
		},
	};
};

export { MAX_TOKENS_PER_ADMIN, MAX_TOKENS_TOTAL, TOKEN_TTL_MS };
