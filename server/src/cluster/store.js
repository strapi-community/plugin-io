import { createHash } from 'node:crypto';

/**
 * Shared state for several Strapi processes (pm2 cluster workers, Railway
 * replicas) that use one database but no shared memory.
 *
 * Two backends with the same API:
 * - memory: one process, the plugin's behaviour before 6.x multi-instance support;
 * - database: four small plugin-owned tables, created with portable knex
 *   schema calls. Strapi's schema sync leaves tables alone that are neither in
 *   the content-type schema nor in its previously stored schema
 *   (`@strapi/database` 5.61 `schema/diff.js`), so they survive restarts.
 *
 * Every database write is a single-row INSERT, UPDATE or DELETE whose row
 * count decides the outcome, so it is atomic on PostgreSQL, MySQL and SQLite
 * without locks. No raw IP addresses or tokens are stored: counter keys and
 * presence tokens are SHA-256 hashes.
 */

const TABLES = Object.freeze({
	presence: 'plugin_io_presence_tokens',
	counters: 'plugin_io_counters',
	nodes: 'plugin_io_nodes',
	signals: 'plugin_io_signals',
});

const MAX_KEY = 191;

/**
 * Hashes a value for storage (tokens, counter keys).
 *
 * @param {string} value - Raw value.
 * @returns {string} Hex SHA-256.
 */
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

/** @param {unknown} value @returns {number} */
const num = (value) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};

/**
 * Normalises a Strapi/knex client name.
 *
 * @param {string | undefined} client - Client name.
 * @returns {'postgres' | 'mysql' | 'sqlite' | 'other'} Dialect.
 */
function normalizeDialect(client) {
	const value = String(client || '').toLowerCase();
	if (['postgres', 'pg', 'postgresql'].includes(value)) return 'postgres';
	if (['mysql', 'mysql2', 'mariadb'].includes(value)) return 'mysql';
	if (['sqlite', 'sqlite3', 'better-sqlite3'].includes(value)) return 'sqlite';
	return 'other';
}

/**
 * In-process backend. Presence tokens and counters live in Maps; node and
 * signal tables do not exist (one process has no peers).
 *
 * @returns {object} Store.
 */
function createMemoryStore() {
	/** @type {Map<string, { adminId: string, firstname: string | null, lastname: string | null, sessionId: string | null, expiresAt: number, createdAt: number }>} */
	const tokens = new Map();
	/** @type {Map<string, string[]>} Token hashes per admin, oldest first. */
	const byAdmin = new Map();
	/** @type {Map<string, { hits: number, windowStart: number }>} */
	const counters = new Map();

	const forget = (hash) => {
		const row = tokens.get(hash);
		if (!row) return null;
		tokens.delete(hash);
		const rest = (byAdmin.get(row.adminId) ?? []).filter((h) => h !== hash);
		if (rest.length) byAdmin.set(row.adminId, rest);
		else byAdmin.delete(row.adminId);
		return row;
	};

	return {
		mode: 'memory',
		async ensure() {},

		async putToken(hash, row) {
			tokens.set(hash, { ...row });
			byAdmin.set(row.adminId, [...(byAdmin.get(row.adminId) ?? []), hash]);
		},
		async takeToken(hash, now = Date.now()) {
			const row = forget(hash);
			return row && row.expiresAt > now ? row : null;
		},
		/** Counts pending tokens (expired ones count until the next sweep). */
		async countTokens(_now = Date.now(), adminId) {
			return adminId === undefined ? tokens.size : (byAdmin.get(adminId)?.length ?? 0);
		},
		async trimAdminTokens(adminId, keep) {
			const own = byAdmin.get(adminId) ?? [];
			for (const hash of own.slice(0, Math.max(own.length - keep, 0))) forget(hash);
		},
		async sweepTokens(now = Date.now()) {
			for (const [hash, t] of tokens) if (t.expiresAt <= now) forget(hash);
		},
		async clearTokens() {
			tokens.clear();
			byAdmin.clear();
		},

		async hit(key, windowMs, now = Date.now()) {
			let entry = counters.get(key);
			if (!entry || entry.windowStart <= now - windowMs) entry = { hits: 0, windowStart: now };
			entry.hits += 1;
			counters.set(key, entry);
			if (counters.size > 10_000) {
				for (const [k, v] of counters) if (v.windowStart <= now - windowMs) counters.delete(k);
			}
			return { hits: entry.hits, windowStart: entry.windowStart };
		},
		async clearCounter(key) {
			counters.delete(key);
		},

		async beat() {},
		async listNodes() {
			return [];
		},
		async removeNode() {},
		async pruneNodes() {},

		async pushSignal() {},
		async signalsAfter() {
			return [];
		},
		async lastSignalId() {
			return 0;
		},
		async pruneSignals() {},
	};
}

/**
 * Creates the plugin tables when missing. Safe when several processes start
 * at once: a losing CREATE TABLE is ignored once the table exists.
 *
 * @param {import('knex').Knex} knex - Knex instance (`strapi.db.connection`).
 * @returns {Promise<void>}
 */
async function ensureTables(knex) {
	const definitions = [
		[
			TABLES.presence,
			(t) => {
				t.string('token_hash', 64).notNullable().primary();
				t.string('admin_id', 64).notNullable();
				t.string('firstname', 255).nullable();
				t.string('lastname', 255).nullable();
				t.string('session_id', 255).nullable();
				t.bigInteger('expires_at').notNullable();
				t.bigInteger('created_at').notNullable();
				t.index(['admin_id'], 'plugin_io_presence_admin_idx');
				t.index(['expires_at'], 'plugin_io_presence_expires_idx');
			},
		],
		[
			TABLES.counters,
			(t) => {
				t.string('k', MAX_KEY).notNullable().primary();
				t.integer('hits').notNullable().defaultTo(0);
				t.bigInteger('window_start').notNullable().defaultTo(0);
				t.bigInteger('expires_at').notNullable().defaultTo(0);
				t.index(['expires_at'], 'plugin_io_counters_expires_idx');
			},
		],
		[
			TABLES.nodes,
			(t) => {
				t.string('node_id', 128).notNullable().primary();
				t.bigInteger('heartbeat_at').notNullable();
				t.bigInteger('started_at').notNullable();
				t.text('stats').nullable();
			},
		],
		[
			TABLES.signals,
			(t) => {
				t.increments('id').primary();
				t.string('uid', 64).notNullable();
				t.string('kind', 32).notNullable();
				t.string('origin', 128).notNullable();
				t.text('payload').nullable();
				t.bigInteger('created_at').notNullable();
				t.index(['created_at'], 'plugin_io_signals_created_idx');
			},
		],
	];
	for (const [name, build] of definitions) {
		if (await knex.schema.hasTable(name)) continue;
		try {
			await knex.schema.createTable(name, build);
		} catch (error) {
			if (!(await knex.schema.hasTable(name))) throw error;
		}
	}
}

/**
 * Database backend on Strapi's knex connection.
 *
 * @param {{ knex: import('knex').Knex, dialect?: string }} options - Knex and client name.
 * @returns {object} Store.
 */
function createDatabaseStore({ knex, dialect }) {
	const kind = normalizeDialect(dialect);
	const returning = kind === 'postgres' || kind === 'sqlite';

	const toToken = (row) =>
		row
			? {
					adminId: String(row.admin_id),
					firstname: row.firstname ?? null,
					lastname: row.lastname ?? null,
					sessionId: row.session_id ?? null,
					expiresAt: num(row.expires_at),
					createdAt: num(row.created_at),
				}
			: null;

	/**
	 * Increments a fixed-window counter in one UPDATE and returns the values
	 * this UPDATE wrote (RETURNING on PostgreSQL and SQLite; UPDATE and SELECT
	 * in one transaction with a row lock elsewhere).
	 */
	const bump = async (key, windowMs, now) => {
		const cutoff = now - windowMs;
		const data = {
			hits: knex.raw('CASE WHEN window_start <= ? THEN 1 ELSE hits + 1 END', [cutoff]),
			expires_at: now + windowMs,
			window_start: knex.raw('CASE WHEN window_start <= ? THEN ? ELSE window_start END', [cutoff, now]),
		};
		if (returning) {
			const rows = await knex(TABLES.counters).where({ k: key }).update(data, ['hits', 'window_start']);
			return rows?.[0] ? { hits: num(rows[0].hits), windowStart: num(rows[0].window_start) } : null;
		}
		return knex.transaction(async (trx) => {
			const changed = await trx(TABLES.counters).where({ k: key }).update(data);
			if (!num(changed)) return null;
			const row = await trx(TABLES.counters).select('hits', 'window_start').where({ k: key }).forUpdate().first();
			return row ? { hits: num(row.hits), windowStart: num(row.window_start) } : null;
		});
	};

	return {
		mode: 'database',
		dialect: kind,
		ensure: () => ensureTables(knex),

		async putToken(hash, row) {
			await knex(TABLES.presence).insert({
				token_hash: hash,
				admin_id: String(row.adminId),
				firstname: row.firstname,
				lastname: row.lastname,
				session_id: row.sessionId,
				expires_at: row.expiresAt,
				created_at: row.createdAt,
			});
		},
		/**
		 * One-time consume: only the caller whose DELETE removes the row wins,
		 * so two processes can never both accept the same token.
		 */
		async takeToken(hash, now = Date.now()) {
			const row = await knex(TABLES.presence).where({ token_hash: hash }).first();
			if (!row) return null;
			const deleted = await knex(TABLES.presence).where({ token_hash: hash }).del();
			if (num(deleted) !== 1) return null;
			const token = toToken(row);
			return token.expiresAt > now ? token : null;
		},
		async countTokens(now = Date.now(), adminId) {
			const query = knex(TABLES.presence).where('expires_at', '>', now);
			if (adminId !== undefined) query.andWhere({ admin_id: String(adminId) });
			const row = await query.count({ n: '*' }).first();
			return num(row?.n);
		},
		async trimAdminTokens(adminId, keep) {
			const rows = await knex(TABLES.presence)
				.select('token_hash')
				.where({ admin_id: String(adminId) })
				.orderBy('created_at', 'desc');
			const drop = rows.slice(keep).map((r) => r.token_hash);
			if (drop.length) await knex(TABLES.presence).whereIn('token_hash', drop).del();
		},
		async sweepTokens(now = Date.now()) {
			await knex(TABLES.presence).where('expires_at', '<=', now).del();
		},
		async clearTokens() {},

		async hit(key, windowMs, now = Date.now()) {
			let result = await bump(key, windowMs, now);
			if (!result) {
				await knex(TABLES.counters)
					.insert({ k: key, hits: 0, window_start: 0, expires_at: now + windowMs })
					.onConflict('k')
					.ignore();
				result = await bump(key, windowMs, now);
			}
			return result ?? { hits: 1, windowStart: now };
		},
		async clearCounter(key) {
			await knex(TABLES.counters).where({ k: key }).del();
		},
		async pruneCounters(now = Date.now()) {
			await knex(TABLES.counters).where('expires_at', '<', now).del();
		},

		async beat(nodeId, stats, now = Date.now(), startedAt = now) {
			await knex(TABLES.nodes)
				.insert({ node_id: nodeId, heartbeat_at: now, started_at: startedAt, stats: JSON.stringify(stats ?? {}) })
				.onConflict('node_id')
				.merge(['heartbeat_at', 'stats']);
		},
		async listNodes(aliveSince) {
			const rows = await knex(TABLES.nodes).where('heartbeat_at', '>=', aliveSince).orderBy('node_id');
			return rows.map((row) => {
				let stats = {};
				try {
					stats = JSON.parse(row.stats || '{}');
				} catch {}
				return { nodeId: row.node_id, heartbeatAt: num(row.heartbeat_at), startedAt: num(row.started_at), stats };
			});
		},
		async removeNode(nodeId) {
			await knex(TABLES.nodes).where({ node_id: nodeId }).del();
		},
		async pruneNodes(before) {
			await knex(TABLES.nodes).where('heartbeat_at', '<', before).del();
		},

		async pushSignal({ uid, kind: signalKind, origin, payload }, now = Date.now()) {
			await knex(TABLES.signals).insert({
				uid,
				kind: signalKind,
				origin,
				payload: JSON.stringify(payload ?? null),
				created_at: now,
			});
		},
		async signalsAfter(id, limit = 200) {
			const rows = await knex(TABLES.signals).where('id', '>', id).orderBy('id', 'asc').limit(limit);
			return rows.map((row) => {
				let payload = null;
				try {
					payload = JSON.parse(row.payload ?? 'null');
				} catch {}
				return { id: num(row.id), uid: row.uid, kind: row.kind, origin: row.origin, payload };
			});
		},
		async lastSignalId() {
			const row = await knex(TABLES.signals).max({ id: 'id' }).first();
			return num(row?.id);
		},
		async pruneSignals(before) {
			await knex(TABLES.signals).where('created_at', '<', before).del();
		},
	};
}

export { createDatabaseStore, createMemoryStore, ensureTables, normalizeDialect, sha256, TABLES };
