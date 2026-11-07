/**
 * Builds the Socket.IO adapter configured in `config.socket.adapter`. The
 * adapter packages are optional peer dependencies and are loaded only when
 * configured, so single-process installs need nothing extra.
 *
 * - `postgres`: `@socket.io/postgres-adapter` (LISTEN/NOTIFY) on its own small
 *   `pg` pool (2 connections by default). It needs a session-mode connection,
 *   so not a PgBouncer transaction pool. Payloads over 8000 bytes go through
 *   the `socket_io_attachments` table, which is created here.
 *   https://socket.io/docs/v4/postgres-adapter/
 * - `redis`: `@socket.io/redis-adapter` with two `ioredis` clients. The
 *   Socket.IO docs recommend ioredis because the `redis` package "seems to
 *   have problems restoring the Redis subscriptions after reconnection".
 *   https://socket.io/docs/v4/redis-adapter/
 * - a function: `({ strapi }) => adapter` or `{ adapter, close }`, for any
 *   other adapter.
 */

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

/**
 * Loads an optional package and explains how to install it when missing.
 *
 * @param {string} name - Package name.
 * @param {string} feature - Feature that needs it.
 * @returns {Promise<any>} Module namespace.
 * @throws {Error} When the package is not installed.
 */
async function load(name, feature) {
	try {
		return await import(name);
	} catch (error) {
		if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') {
			throw new Error(`[io] ${feature} needs the package "${name}". Install it with: npm install ${name}`, {
				cause: error,
			});
		}
		throw error;
	}
}

/**
 * Reads a named export from a module namespace, also when a CommonJS package
 * only exposes it on `default`.
 *
 * @param {any} mod - Module namespace.
 * @param {string} name - Export name.
 * @returns {any} Export.
 */
const pick = (mod, name) => mod?.[name] ?? mod?.default?.[name];

/**
 * Drops undefined options. The adapters merge options with
 * `Object.assign(defaults, opts)`, so an undefined key would replace a
 * default (for example `cleanupInterval`, which then breaks the cleanup
 * query with "undefined milliseconds").
 *
 * @param {Record<string, unknown>} options - Options.
 * @returns {Record<string, unknown>} Options without undefined values.
 */
const defined = (options) => Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));

/**
 * Normalises `config.socket.adapter` (`'postgres'`, `'redis'`, an object with
 * `type`, or a function).
 *
 * @param {unknown} value - Configured value.
 * @returns {null | { type: 'postgres' | 'redis' | 'custom', options: object }} Normalised config.
 */
function normalizeAdapterConfig(value) {
	if (!value) return null;
	if (typeof value === 'function') return { type: 'custom', options: { create: value } };
	if (typeof value === 'string') return { type: value, options: {} };
	const { type, ...options } = value;
	return { type: type ?? (typeof options.create === 'function' ? 'custom' : undefined), options };
}

/**
 * Picks the pg connection for the adapter pool: `connection` /
 * `connectionString` from the adapter config, otherwise Strapi's own
 * PostgreSQL connection settings.
 *
 * @param {object} options - Adapter options.
 * @param {any} strapi - Strapi instance.
 * @returns {object} pg Pool connection settings.
 * @throws {Error} When no PostgreSQL connection is available.
 */
function pgConnection(options, strapi) {
	if (options.connectionString) return { connectionString: options.connectionString };
	if (options.connection) return { ...options.connection };
	const db = strapi.config?.get?.('database.connection') ?? {};
	if (db.client !== 'postgres') {
		throw new Error(
			'[io] socket.adapter "postgres" needs a PostgreSQL database, or set socket.adapter.connectionString.'
		);
	}
	const conn = typeof db.connection === 'string' ? { connectionString: db.connection } : { ...db.connection };
	// Strapi-only keys that pg does not understand.
	delete conn.schema;
	return conn;
}

/**
 * Creates the configured adapter.
 *
 * @param {unknown} adapterConfig - `config.socket.adapter`.
 * @param {{ strapi: any }} deps - Strapi instance.
 * @returns {Promise<null | { type: string, adapter: any, close: () => Promise<void> }>} Adapter factory for `new Server(..., { adapter })`.
 * @throws {Error} When a package is missing or the config is invalid.
 */
async function createConfiguredAdapter(adapterConfig, { strapi }) {
	const normalized = normalizeAdapterConfig(adapterConfig);
	if (!normalized) return null;
	const { type, options } = normalized;
	const log = strapi.log;
	let lastError = 0;
	const errorHandler = (error) => {
		const now = Date.now();
		if (now - lastError < 60_000) return;
		lastError = now;
		log?.warn?.(
			`[io] Socket.IO ${type} adapter error: ${error?.message ?? error}. Events reach only local clients until it recovers.`
		);
	};

	if (type === 'postgres') {
		const createAdapter = pick(await load('@socket.io/postgres-adapter', 'socket.adapter "postgres"'), 'createAdapter');
		const Pool = pick(await load('pg', 'socket.adapter "postgres"'), 'Pool');
		const tableName = options.tableName ?? 'socket_io_attachments';
		if (!IDENTIFIER_RE.test(tableName))
			throw new Error('[io] socket.adapter.tableName must be a plain SQL identifier.');
		const pool = new Pool({
			...pgConnection(options, strapi),
			max: options.poolMax ?? 2,
			application_name: 'strapi-plugin-io',
		});
		pool.on('error', errorHandler);
		try {
			await pool.query(
				`CREATE TABLE IF NOT EXISTS ${tableName} (id bigserial UNIQUE, created_at timestamptz DEFAULT NOW(), payload bytea)`
			);
		} catch (error) {
			// Two processes creating the table at the same moment can collide in
			// pg_type (unique_violation); the table exists afterwards.
			if (error?.code !== '23505' && error?.code !== '42P07') {
				await pool.end().catch(() => {});
				throw error;
			}
		}
		const adapter = createAdapter(
			pool,
			defined({
				tableName,
				channelPrefix: options.channelPrefix,
				payloadThreshold: options.payloadThreshold,
				cleanupInterval: options.cleanupInterval,
				heartbeatInterval: options.heartbeatInterval,
				heartbeatTimeout: options.heartbeatTimeout,
				errorHandler,
			})
		);
		return {
			type,
			adapter,
			close: async () => {
				await pool.end().catch(() => {});
			},
		};
	}

	if (type === 'redis') {
		const createAdapter = pick(await load('@socket.io/redis-adapter', 'socket.adapter "redis"'), 'createAdapter');
		const Redis = pick(await load('ioredis', 'socket.adapter "redis"'), 'Redis');
		const url = options.url ?? process.env.REDIS_URL;
		if (!url && !options.redisOptions) {
			throw new Error('[io] socket.adapter "redis" needs socket.adapter.url or the REDIS_URL variable.');
		}
		const pubClient = url ? new Redis(url, options.redisOptions ?? {}) : new Redis(options.redisOptions);
		const subClient = pubClient.duplicate();
		pubClient.on('error', errorHandler);
		subClient.on('error', errorHandler);
		const adapter = createAdapter(
			pubClient,
			subClient,
			defined({
				key: options.key,
				requestsTimeout: options.requestsTimeout ?? 5000,
				publishOnSpecificResponseChannel: options.publishOnSpecificResponseChannel ?? true,
			})
		);
		return {
			type,
			adapter,
			close: async () => {
				await Promise.allSettled([pubClient.quit(), subClient.quit()]);
			},
		};
	}

	if (type === 'custom') {
		const result = await options.create({ strapi });
		if (typeof result === 'function') return { type, adapter: result, close: async () => {} };
		if (result && typeof result.adapter === 'function') {
			return { type, adapter: result.adapter, close: result.close ?? (async () => {}) };
		}
		throw new Error('[io] socket.adapter.create must return an adapter or { adapter, close }.');
	}

	throw new Error(`[io] Unknown socket.adapter type "${type}". Use "postgres", "redis" or a function.`);
}

export { createConfiguredAdapter, defined, normalizeAdapterConfig, pgConnection };
