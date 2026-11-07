import { z } from 'zod';
import { CONTENT_ACTIONS } from '../utils/constants.js';

const fn = z.custom((value) => typeof value === 'function', { error: 'Expected a function' });

const Event = z.object({
	name: z.string().min(1),
	handler: fn,
	/** Also run the handler on admin presence sockets (`socket.data.kind === 'admin'`). */
	admin: z.boolean().optional(),
});

const Hooks = z.object({
	init: fn.optional(),
});

const ContentTypeAction = z.enum(CONTENT_ACTIONS);

/**
 * Populate configuration for content type events:
 * - `'*'` or `true`: populate all relations one level deep
 * - `string[]`: populate the listed relations
 * - object: Strapi populate syntax
 */
const PopulateConfig = z.union([z.literal('*'), z.literal(true), z.array(z.string()), z.record(z.string(), z.any())]);

const ContentType = z.object({
	uid: z.string().min(1),
	actions: z.array(ContentTypeAction).optional(),
	populate: PopulateConfig.optional(),
});

const identifier = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,62}$/);
const positiveMs = z
	.number()
	.int()
	.min(100)
	.max(10 * 60 * 1000);

/** `@socket.io/postgres-adapter` on its own pg pool (https://socket.io/docs/v4/postgres-adapter/). */
const PostgresAdapter = z.object({
	type: z.literal('postgres'),
	/** pg connection string; defaults to Strapi's own PostgreSQL connection. */
	connectionString: z.string().min(1).optional(),
	/** pg connection object; defaults to Strapi's own PostgreSQL connection. */
	connection: z.record(z.string(), z.any()).optional(),
	/** Connections of the adapter's pool (one LISTEN plus NOTIFY/attachments). */
	poolMax: z.number().int().min(2).max(20).optional(),
	tableName: identifier.optional(),
	channelPrefix: z.string().min(1).max(63).optional(),
	payloadThreshold: z.number().int().min(100).max(8000).optional(),
	cleanupInterval: positiveMs.optional(),
	heartbeatInterval: positiveMs.optional(),
	heartbeatTimeout: positiveMs.optional(),
});

/** `@socket.io/redis-adapter` with ioredis clients (https://socket.io/docs/v4/redis-adapter/). */
const RedisAdapter = z.object({
	type: z.literal('redis'),
	/** Redis URL; defaults to the REDIS_URL variable. */
	url: z.string().min(1).optional(),
	/** ioredis options. */
	redisOptions: z.record(z.string(), z.any()).optional(),
	key: z.string().min(1).max(100).optional(),
	requestsTimeout: positiveMs.optional(),
	publishOnSpecificResponseChannel: z.boolean().optional(),
});

/** Any other adapter: `create({ strapi })` returns the adapter or `{ adapter, close }`. */
const CustomAdapter = z.object({ type: z.literal('custom').optional(), create: fn });

const Adapter = z.union([
	z.enum(['postgres', 'redis']),
	fn,
	z.discriminatedUnion('type', [PostgresAdapter, RedisAdapter, CustomAdapter.extend({ type: z.literal('custom') })]),
	CustomAdapter,
]);

const Socket = z.object({
	serverOptions: z.record(z.string(), z.any()).optional(),
	/** Multi-server adapter for several processes (Railway replicas, pm2 cluster). */
	adapter: Adapter.optional(),
	/** Accept WebSocket connections only (no long-polling), so no sticky sessions are needed. */
	websocketOnly: z.boolean().optional(),
});

/** Coordination of several processes through the database. */
const Cluster = z.object({
	/** `'auto'` (default): on with a multi-server adapter, in pm2 cluster mode or on Railway. */
	enabled: z.union([z.literal('auto'), z.boolean()]).optional(),
	/** How often each process reads new control signals (ms). */
	pollInterval: z.number().int().min(500).max(60_000).optional(),
	/** How often each process writes its heartbeat and counters (ms). */
	heartbeatInterval: z.number().int().min(2000).max(120_000).optional(),
});

/** Plugin configuration schema (`config/plugins.js` > `io.config`). */
const plugin = z.object({
	events: z.array(Event).optional(),
	hooks: Hooks.optional(),
	contentTypes: z.array(z.union([z.string().min(1), ContentType])),
	socket: Socket.optional(),
	cluster: Cluster.optional(),
	/** Extra field names that are never emitted, added to the built-in list. */
	sensitiveFields: z.array(z.string()).optional(),
});

export { plugin, PopulateConfig };
