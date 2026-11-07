/// <reference types="node" />
import type { Server as SocketIOServer, ServerOptions, Socket } from 'socket.io';
import type { Core } from '@strapi/types';

declare module '@strapi/types/dist/core/strapi.js' {
	interface Strapi {
		/**
		 * The plugin's Socket.IO wrapper.
		 * @example strapi.$io.server.emit('notification', { message: 'Hello' });
		 */
		$io: SocketIO;
	}
}

/** Content events the plugin emits as `<singularName>:<action>`. */
export type ContentTypeAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'discardDraft';

/** Populate configuration for content type events. */
export type PopulateConfig = '*' | true | string[] | Record<string, unknown>;

export interface ContentTypeConfig {
	/** Content type uid, e.g. `api::article.article`. */
	uid: string;
	/** Actions that emit events. Defaults to all actions. */
	actions?: ContentTypeAction[];
	/** Relations to populate in create, update, publish and discardDraft events. */
	populate?: PopulateConfig;
}

/**
 * What the handshake stores on `socket.data`. Check `kind` before trusting an id:
 * `user` ids are Users & Permissions ids, `admin` ids are admin user ids.
 */
export interface SocketData {
	kind: 'public' | 'user' | 'token' | 'admin';
	/** Users & Permissions user (`kind === 'user'` only). */
	user?: { id: number; role: { id: number; name: string; type: string } };
	/** Users & Permissions role (`public` and `user`). */
	role?: { id: number; name: string; type: string };
	/** Content API token (`kind === 'token'` only). */
	token?: { id: number; type: 'read-only' | 'full-access' | 'custom' };
	/** Admin user (`kind === 'admin'` only, presence sockets). */
	admin?: { id: number; firstname: string | null; lastname: string | null };
	/** Credential expiry in ms, or null. */
	expiresAt?: number | null;
}

export interface SocketEvent {
	/** Client event name, or `connection` to run once per new socket. */
	name: string;
	/** Also run on admin presence sockets. Default `false`: admin sockets are skipped. */
	admin?: boolean;
	handler: (context: { strapi: Core.Strapi; io: SocketIO }, socket: Socket, ...args: any[]) => void | Promise<void>;
}

/** Factory for any Socket.IO adapter; may also return the connections to close on shutdown. */
export type SocketAdapterFactory = (context: {
	strapi: Core.Strapi;
}) => unknown | { adapter: unknown; close?: () => Promise<void> } | Promise<unknown>;

export type SocketAdapterConfig =
	| 'postgres'
	| 'redis'
	| SocketAdapterFactory
	| {
			type: 'postgres';
			/** Defaults to Strapi's own PostgreSQL connection. */
			connectionString?: string;
			connection?: Record<string, unknown>;
			/** Connections of the adapter's own pool (default 2). */
			poolMax?: number;
			tableName?: string;
			channelPrefix?: string;
			payloadThreshold?: number;
			cleanupInterval?: number;
			heartbeatInterval?: number;
			heartbeatTimeout?: number;
	  }
	| {
			type: 'redis';
			/** Defaults to the REDIS_URL variable. */
			url?: string;
			redisOptions?: Record<string, unknown>;
			key?: string;
			requestsTimeout?: number;
			publishOnSpecificResponseChannel?: boolean;
	  }
	| { type?: 'custom'; create: SocketAdapterFactory };

/** `config/plugins` > `io.config`. */
export interface SocketIOConfig {
	events?: SocketEvent[];
	hooks?: {
		/**
		 * Awaited during bootstrap, before the plugin handshake is added, e.g. to
		 * attach a Redis adapter or `$io.server.use()` middleware. `io` is an
		 * alias of `$io`.
		 */
		init?: (context: { strapi: Core.Strapi; $io: SocketIO; io: SocketIO }) => void | Promise<void>;
	};
	contentTypes: Array<string | ContentTypeConfig>;
	socket?: {
		/**
		 * Socket.IO server options. `cors` and `allowRequest` default to the admin
		 * setting "Allowed origins"; values set here win.
		 */
		serverOptions?: Partial<ServerOptions> & { destroyUpgrade?: boolean; destroyUpgradeTimeout?: number };
		/**
		 * Multi-server adapter, required when more than one process serves
		 * Socket.IO (Railway replicas, pm2 cluster). The packages are optional
		 * peers: `@socket.io/postgres-adapter` + `pg`, or
		 * `@socket.io/redis-adapter` + `ioredis`. See README "Running several instances".
		 */
		adapter?: SocketAdapterConfig;
		/** Accept WebSocket connections only (no long-polling), so no sticky sessions are needed. */
		websocketOnly?: boolean;
	};
	/** Coordination of several processes through the database (presence tokens, settings, revocations, monitoring). */
	cluster?: {
		/** `'auto'` (default): on with a multi-server adapter, in pm2 cluster mode or on Railway. */
		enabled?: 'auto' | boolean;
		/** How often each process reads new control signals, in ms (default 3000). */
		pollInterval?: number;
		/** How often each process writes its heartbeat and counters, in ms (default 10000). */
		heartbeatInterval?: number;
	};
	/** Extra field names that are never emitted. */
	sensitiveFields?: string[];
}

/** Payload of create, update, publish and discardDraft events. */
export interface EntryEventPayload {
	data: { id: number; attributes: Record<string, unknown> };
	meta: Record<string, never>;
}

/** Payload of delete and unpublish events. */
export interface IdentifierEventPayload {
	data: { documentId: string; locale?: string };
}

export interface EmitOptions {
	event: ContentTypeAction;
	/** Content type uid or an object with `uid` (and optionally `singularName`). */
	schema: string | { uid: string; singularName?: string };
	data: Record<string, unknown>;
	/** Send to the audience rooms (default `true`). `false` reaches only the entity subscribers of `data.documentId`. */
	broadcast?: boolean;
}

/** Outcome of an entity subscription request (`subscribe-entity` ack and the server helpers). */
export type EntitySubscriptionResult =
	| { success: true; uid: string; documentId: string; /** Alias of `documentId` (5.x clients). */ id: string }
	| { success: false; error: string };

export interface RawEmitOptions {
	event: string;
	data: unknown;
	rooms?: string[];
}

export type EntitySubscriptionList =
	| { success: true; subscriptions: Array<{ uid: string; documentId: string; id: string }> }
	| { success: false; error: string };

export declare class SocketIO {
	constructor(
		options?: SocketIOConfig['socket'] extends infer S ? (S extends { serverOptions?: infer O } ? O : never) : never,
		deps?: { strapi?: Core.Strapi }
	);
	/** Emits a content event to every audience with read permission. Resolves with the number of rooms reached. */
	emit(options: EmitOptions): Promise<number>;
	/** Emits `{ data: { documentId, locale } }` to every audience with read permission. */
	emitIdentifier(options: {
		event: ContentTypeAction;
		schema: string | { uid: string; singularName?: string };
		data: { documentId: string; locale?: string | null };
		broadcast?: boolean;
	}): Promise<number>;
	/** Emits a custom event; sensitive fields are removed. Without rooms it goes to every client. */
	raw(options: RawEmitOptions): Promise<void>;
	/**
	 * Adds a socket to a room. Plugin-managed rooms (io-role-, io-token-, io-admin-, io-entity-, presence:) are refused.
	 * With a multi-server adapter a socket on another process is looked up by its exact id and the result is a
	 * Promise: always `await` it. A room name passed as `socketId` never selects the sockets of that room.
	 */
	joinRoom(socketId: string, room: string): boolean | Promise<boolean>;
	/** Removes a socket from a room (on any process with a multi-server adapter; see `joinRoom`). */
	leaveRoom(socketId: string, room: string): boolean | Promise<boolean>;
	getSocketsInRoom(room: string): Promise<string[]>;
	sendPrivateMessage(socketId: string, event: string, data: unknown): void;
	broadcast(socketId: string, event: string, data: unknown): void;
	emitToNamespace(namespace: string, event: string, data: unknown): void;
	/** Disconnects the socket with this exact id (on any process with a multi-server adapter; see `joinRoom`). */
	disconnectSocket(socketId: string): boolean | Promise<boolean>;
	/** Subscribes a socket to one document with the same checks as `subscribe-entity`. */
	subscribeToEntity(
		socketId: string,
		uid: string,
		documentId: string
	): Promise<EntitySubscriptionResult | { success: false; error: 'Socket not found' }>;
	/** A Promise when the socket is on another process (multi-server adapter): always `await` it. */
	unsubscribeFromEntity(
		socketId: string,
		uid: string,
		documentId: string
	): EntitySubscriptionResult | Promise<EntitySubscriptionResult>;
	/** A Promise when the socket is on another process (multi-server adapter): always `await` it. */
	getEntitySubscriptions(socketId: string): EntitySubscriptionList | Promise<EntitySubscriptionList>;
	/**
	 * Re-checks authenticated sockets (in every namespace) and disconnects invalid ones.
	 * `ids` limits the check to the sockets of those user, admin or API token ids.
	 */
	revalidateSockets(
		kinds?: Array<'user' | 'token' | 'admin'>,
		options?: { ids?: Iterable<number | string> }
	): Promise<number>;
	destroy(): Promise<void>;
	/** Namespaces by name without the leading slash. */
	readonly namespaces: Record<string, import('socket.io').Namespace>;
	readonly server: SocketIOServer;
}

export interface PluginSettings {
	version: 2;
	cors: { origins: string[] };
	connection: { maxConnections: number; pingTimeout: number; pingInterval: number; connectionTimeout: number };
	security: {
		requireAuthentication: boolean;
		rateLimiting: { enabled: boolean; maxEventsPerSecond: number };
		ipWhitelist: string[];
		ipBlacklist: string[];
	};
	events: { onlyPublished: boolean; excludeFields: string[]; contentTypes: Record<string, ContentTypeAction[]> };
	rolePermissions: Record<string, { canConnect: boolean }>;
	presence: { enabled: boolean; showTypingIndicator: boolean };
	/** Entity subscriptions (`subscribe-entity`); off by default. */
	subscriptions: { enabled: boolean; maxPerSocket: number };
	monitoring: { enableConnectionLogging: boolean; enableEventLogging: boolean; maxEventLogSize: number };
}

export interface SettingsService {
	load(): Promise<PluginSettings>;
	/** Re-reads the stored settings and applies them when another process saved a newer revision. */
	refresh(): Promise<PluginSettings>;
	current(): PluginSettings;
	/** Revision of the current settings; every save increments it. */
	revision(): number;
	getSettings(): Promise<PluginSettings>;
	/** `revision` makes the save fail with a `SettingsConflictError` when someone saved in between. */
	setSettings(update: Partial<PluginSettings> & { revision?: number }): Promise<PluginSettings>;
	onChange(listener: (settings: PluginSettings) => void): () => void;
}

export interface MonitoringService {
	recordEvent(event: string, meta?: { audiences?: number | null; source?: 'content' | 'raw' | 'test' }): void;
	recordConnection(): void;
	getEventStats(): {
		totalEvents: number;
		eventsPerSecond: number;
		lastEventAt: string | null;
		totalConnections: number;
		since: string;
	};
	getConnectionStats(): Promise<{
		connected: number;
		rooms: number;
		byKind: Record<'admin' | 'user' | 'token' | 'public', number>;
	}>;
	/** Event log of this process. */
	getEventLog(limit?: number): EventLogEntry[];
	/** Event log of every process that answers (needs a multi-server adapter); `scope: 'instance'` otherwise. */
	collectEventLog(limit?: number): Promise<{ entries: EventLogEntry[]; scope: 'all' | 'instance' }>;
	/** Counters summed over every live process. */
	getClusterStats(): Promise<{
		connections: { connected: number; rooms: number; byKind: Record<'admin' | 'user' | 'token' | 'public', number> };
		events: {
			totalEvents: number;
			eventsPerSecond: number;
			lastEventAt: string | null;
			totalConnections: number;
			since: string | null;
		};
		instances: ClusterStatus & { count: number };
	}>;
	reset(): void;
}

export interface EventLogEntry {
	id: number;
	timestamp: string;
	event: string;
	source: string;
	audiences: number | null;
}

export interface ClusterStatus {
	/** `database` when several processes share state through the database. */
	mode: 'single' | 'database';
	adapter: string;
	clusterAdapter: boolean;
	instances: number;
	/** `no-adapter`, `polling`, `proxy`. */
	warnings: string[];
}

export interface SanitizeService {
	output(params: { schema: { uid: string }; data: unknown; options: unknown }): Promise<unknown>;
	sanitizeRaw<T>(data: T): T;
	getSensitiveFields(): string[];
	DEFAULT_SENSITIVE_FIELDS: readonly string[];
}
