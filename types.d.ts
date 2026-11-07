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

export interface SocketEvent {
	/** Client event name, or `connection` to run once per new socket. */
	name: string;
	handler: (context: { strapi: Core.Strapi; io: SocketIO }, socket: Socket, ...args: any[]) => void | Promise<void>;
}

/** `config/plugins` > `io.config`. */
export interface SocketIOConfig {
	events?: SocketEvent[];
	hooks?: {
		/** Awaited during bootstrap, e.g. to attach a Redis adapter. */
		init?: (context: { strapi: Core.Strapi; $io: SocketIO }) => void | Promise<void>;
	};
	contentTypes: Array<string | ContentTypeConfig>;
	socket?: {
		/**
		 * Socket.IO server options. `cors` and `allowRequest` default to the admin
		 * setting "Allowed origins"; values set here win.
		 */
		serverOptions?: Partial<ServerOptions> & { destroyUpgrade?: boolean; destroyUpgradeTimeout?: number };
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
}

export interface RawEmitOptions {
	event: string;
	data: unknown;
	rooms?: string[];
}

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
	}): Promise<number>;
	/** Emits a custom event; sensitive fields are removed. Without rooms it goes to every client. */
	raw(options: RawEmitOptions): Promise<void>;
	/** Adds a socket to a room. Plugin-managed rooms (io-role-, io-token-, io-admin-, presence:) are refused. */
	joinRoom(socketId: string, room: string): boolean;
	leaveRoom(socketId: string, room: string): boolean;
	getSocketsInRoom(room: string): Promise<string[]>;
	sendPrivateMessage(socketId: string, event: string, data: unknown): void;
	broadcast(socketId: string, event: string, data: unknown): void;
	emitToNamespace(namespace: string, event: string, data: unknown): void;
	disconnectSocket(socketId: string): boolean;
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
	monitoring: { enableConnectionLogging: boolean; enableEventLogging: boolean; maxEventLogSize: number };
}

export interface SettingsService {
	load(): Promise<PluginSettings>;
	current(): PluginSettings;
	getSettings(): Promise<PluginSettings>;
	setSettings(update: Partial<PluginSettings>): Promise<PluginSettings>;
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
	getEventLog(
		limit?: number
	): Array<{ id: number; timestamp: string; event: string; source: string; audiences: number | null }>;
	reset(): void;
}

export interface SanitizeService {
	output(params: { schema: { uid: string }; data: unknown; options: unknown }): Promise<unknown>;
	sanitizeRaw<T>(data: T): T;
	getSensitiveFields(): string[];
	DEFAULT_SENSITIVE_FIELDS: readonly string[];
}
