/// <reference types="node" />
import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import type { Core } from '@strapi/strapi';

declare module '@strapi/strapi' {
  export interface Strapi {
    /**
     * Global Socket.IO instance with helper functions
     * @example
     * strapi.$io.server.emit('notification', data);
     * strapi.$io.joinRoom(socketId, 'premium-users');
     */
    $io: SocketIO;
    
    /**
     * Current plugin settings (read-only)
     * @example
     * const maxConnections = strapi.$ioSettings.connection.maxConnections;
     */
    $ioSettings?: PluginSettings;
  }
}

export interface SocketIOConfig {
  events?: SocketEvent[];
  hooks?: {
    init?: (context: { strapi: Core.Strapi; $io: SocketIO }) => void | Promise<void>;
  };
  contentTypes?: Array<string | ContentTypeConfig>;
  socket?: {
    serverOptions?: any;
  };
}

export interface SocketEvent {
  name: string;
  handler: (
    context: { strapi: Core.Strapi; io: SocketIO },
    socket: Socket,
    ...args: any[]
  ) => void | Promise<void>;
}

export interface ContentTypeConfig {
  uid: string;
  actions?: Array<'create' | 'update' | 'delete'>;
}

export interface EmitOptions {
  event: 'create' | 'update' | 'delete';
  schema: any;
  data: any;
}

export interface RawEmitOptions {
  event: string;
  data: any;
  rooms?: string[];
}

export interface SocketIOMetrics {
  totalEmits: number;
  cachedLookups: number;
  connectedSockets: number;
  errors: number;
  cacheSize: {
    rooms: number;
    abilities: number;
  };
}

export class SocketIO {
  constructor(options?: any);
  
  /**
   * Emit a content type event with sanitization and permission checking
   */
  emit(options: EmitOptions): Promise<void>;
  
  /**
   * Emit a raw event to specified rooms
   */
  raw(options: RawEmitOptions): Promise<void>;
  
  /**
   * Invalidate the internal cache
   */
  invalidateCache(): void;
  
  /**
   * Get current metrics
   */
  getMetrics(): SocketIOMetrics;
  
  /**
   * Get the underlying Socket.IO server instance
   */
  readonly server: SocketIOServer;
  
  /**
   * All configured namespaces
   */
  namespaces?: Record<string, Namespace>;
  
  /**
   * Join socket to room
   */
  joinRoom?(socketId: string, roomName: string): boolean;
  
  /**
   * Remove socket from room
   */
  leaveRoom?(socketId: string, roomName: string): boolean;
  
  /**
   * Get all sockets in room
   */
  getSocketsInRoom?(roomName: string): Promise<Array<{ id: string; user: any }>>;
  
  /**
   * Send private message to specific socket
   */
  sendPrivateMessage?(socketId: string, event: string, data: any): void;
  
  /**
   * Broadcast from socket to all others
   */
  broadcast?(socketId: string, event: string, data: any): void;
  
  /**
   * Emit to namespace
   */
  emitToNamespace?(namespace: string, event: string, data: any): void;
  
  /**
   * Force disconnect socket
   */
  disconnectSocket?(socketId: string, reason?: string): boolean;
  
  /**
   * Subscribe a socket to a specific entity (server-side)
   */
  subscribeToEntity?(socketId: string, uid: string, id: string | number): Promise<EntitySubscriptionResult>;
  
  /**
   * Unsubscribe a socket from a specific entity
   */
  unsubscribeFromEntity?(socketId: string, uid: string, id: string | number): EntitySubscriptionResult;
  
  /**
   * Get all entity subscriptions for a socket
   */
  getEntitySubscriptions?(socketId: string): EntitySubscriptionsResult;
  
  /**
   * Emit an event to all clients subscribed to a specific entity
   */
  emitToEntity?(uid: string, id: string | number, event: string, data: any): void;
  
  /**
   * Get all sockets subscribed to a specific entity
   */
  getEntityRoomSockets?(uid: string, id: string | number): Promise<Array<{ id: string; user: any }>>;
  
  /**
   * Cleanup and destroy the Socket.IO instance
   */
  destroy(): Promise<void>;
}

export interface EntitySubscriptionResult {
  success: boolean;
  room?: string;
  uid?: string;
  id?: string | number;
  error?: string;
}

export interface EntitySubscriptionsResult {
  success: boolean;
  subscriptions?: Array<{ uid: string; id: string; room: string }>;
  error?: string;
}

/**
 * Plugin Settings
 */
export interface PluginSettings {
  enabled: boolean;
  cors: { origins: string[] };
  connection: {
    maxConnections: number;
    pingTimeout: number;
    pingInterval: number;
    connectionTimeout: number;
  };
  security: {
    requireAuthentication: boolean;
    rateLimiting: {
      enabled: boolean;
      maxEventsPerSecond: number;
    };
    ipWhitelist: string[];
    ipBlacklist: string[];
  };
  events: {
    customEventNames: boolean;
    includeRelations: boolean;
    excludeFields: string[];
    onlyPublished: boolean;
  };
  rooms: {
    autoJoinByRole: Record<string, string[]>;
    enablePrivateRooms: boolean;
  };
  rolePermissions: Record<string, RolePermission>;
  redis: {
    enabled: boolean;
    url: string;
  };
  namespaces: {
    enabled: boolean;
    list: Record<string, { requireAuth: boolean }>;
  };
  monitoring: {
    enableConnectionLogging: boolean;
    enableEventLogging: boolean;
    maxEventLogSize: number;
  };
}

export interface RolePermission {
  canConnect: boolean;
  allowCredentials: boolean;
  allowedMethods: string[];
  contentTypes: Record<string, {
    create: boolean;
    update: boolean;
    delete: boolean;
  }>;
}

/**
 * Settings Service
 */
export interface SettingsService {
  getSettings(): Promise<PluginSettings>;
  setSettings(newSettings: Partial<PluginSettings>): Promise<PluginSettings>;
  getDefaultSettings(): PluginSettings;
}

/**
 * Monitoring Service
 */
export interface MonitoringService {
  getConnectionStats(): ConnectionStats;
  getEventStats(): EventStats;
  getEventLog(limit?: number): EventLogEntry[];
  logEvent(eventType: string, data?: any): void;
  resetStats(): void;
  sendTestEvent(eventName?: string, data?: any): TestEventResult;
}

export interface ConnectionStats {
  connected: number;
  rooms: Array<{ name: string; members: number; isEntityRoom?: boolean }>;
  sockets: Array<{
    id: string;
    connected: boolean;
    rooms: string[];
    entitySubscriptions?: Array<{ uid: string; id: string; room: string }>;
    handshake: {
      address: string;
      time: string;
      query: Record<string, string>;
    };
    user: any;
  }>;
  entitySubscriptions?: {
    total: number;
    byContentType: Record<string, number>;
    rooms: string[];
  };
}

export interface EventStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  lastReset: number;
  eventsPerSecond: string | number;
}

export interface EventLogEntry {
  timestamp: number;
  type: string;
  data: any;
}

export interface TestEventResult {
  success: boolean;
  eventName: string;
  data: any;
  recipients: number;
}

/**
 * Extend Strapi plugin services
 */
declare module '@strapi/strapi' {
  export interface PluginServices {
    io?: {
      settings: SettingsService;
      monitoring: MonitoringService;
    };
  }
}

export default SocketIO;

