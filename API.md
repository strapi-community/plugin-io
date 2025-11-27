# Socket.IO Plugin - Complete API Reference

**Version:** 3.x.x for Strapi v5  
**Vibecode Ready** - Full TypeScript support with IntelliSense

---

## Table of Contents

1. [Global API](#global-api)
2. [Service API](#service-api)
3. [Helper Functions](#helper-functions)
4. [Client API](#client-api)
5. [TypeScript Definitions](#typescript-definitions)
6. [Event Reference](#event-reference)

---

## Global API

### `strapi.$io`

Main Socket.IO instance accessible globally throughout your Strapi application.

```typescript
interface SocketIOInstance {
  server: Server;                    // Raw Socket.IO server
  namespaces: Record<string, Namespace>; // All namespaces
  
  // Methods
  emit(options: EmitOptions): Promise<void>;
  raw(options: RawEmitOptions): Promise<void>;
  
  // Helper functions (see below)
  joinRoom(socketId: string, roomName: string): boolean;
  leaveRoom(socketId: string, roomName: string): boolean;
  getSocketsInRoom(roomName: string): Promise<SocketInfo[]>;
  sendPrivateMessage(socketId: string, event: string, data: any): void;
  broadcast(socketId: string, event: string, data: any): void;
  emitToNamespace(namespace: string, event: string, data: any): void;
  disconnectSocket(socketId: string, reason?: string): boolean;
}
```

#### `strapi.$io.server`

Direct access to the Socket.IO server instance.

```javascript
// Get all connected sockets
const sockets = strapi.$io.server.sockets.sockets;
console.log(`Connected: ${sockets.size}`);

// Emit to all clients
strapi.$io.server.emit('broadcast', { message: 'Hello everyone!' });

// Access rooms
const rooms = strapi.$io.server.sockets.adapter.rooms;
```

#### `strapi.$io.namespaces`

Access all configured namespaces.

```javascript
// Emit to specific namespace
strapi.$io.namespaces.admin.emit('notification', {
  type: 'info',
  message: 'System update'
});

// Check namespace
if (strapi.$io.namespaces.chat) {
  // Chat namespace is active
}
```

### `strapi.$ioSettings`

Current plugin settings (read-only).

```javascript
const settings = strapi.$ioSettings;
console.log('Max connections:', settings.connection.maxConnections);
console.log('CORS origins:', settings.cors.origins);
```

---

## Service API

### Settings Service

Manage plugin configuration programmatically.

```typescript
strapi.plugin('io').service('settings')
```

#### Methods

##### `getSettings()`

Get current plugin settings (merged with defaults).

```javascript
const settingsService = strapi.plugin('io').service('settings');
const settings = await settingsService.getSettings();

console.log(settings.cors.origins);
console.log(settings.connection.maxConnections);
console.log(settings.rolePermissions);
```

**Returns:** `Promise<PluginSettings>`

##### `setSettings(newSettings)`

Update plugin settings (partial update).

```javascript
await settingsService.setSettings({
  connection: {
    maxConnections: 2000,
    pingTimeout: 30000
  },
  cors: {
    origins: ['https://app.example.com']
  }
});
```

**Parameters:**
- `newSettings` - Partial settings object

**Returns:** `Promise<PluginSettings>`

##### `getDefaultSettings()`

Get default plugin settings.

```javascript
const defaults = settingsService.getDefaultSettings();
```

**Returns:** `PluginSettings`

---

### Monitoring Service

Track connections, events, and statistics.

```typescript
strapi.plugin('io').service('monitoring')
```

#### Methods

##### `getConnectionStats()`

Get real-time connection statistics.

```javascript
const monitoringService = strapi.plugin('io').service('monitoring');
const stats = monitoringService.getConnectionStats();

console.log(`Connected clients: ${stats.connected}`);
console.log(`Active rooms: ${stats.rooms.length}`);

stats.sockets.forEach(socket => {
  console.log(`Socket ${socket.id}:`);
  console.log(`  User: ${socket.user?.username || 'anonymous'}`);
  console.log(`  IP: ${socket.handshake.address}`);
  console.log(`  Rooms: ${socket.rooms.join(', ')}`);
});
```

**Returns:**
```typescript
{
  connected: number;
  rooms: Array<{
    name: string;
    members: number;
  }>;
  sockets: Array<{
    id: string;
    connected: boolean;
    rooms: string[];
    handshake: {
      address: string;
      time: string;
      query: Record<string, string>;
    };
    user: {
      id: number;
      username: string;
      email: string;
      role: string;
    } | null;
  }>;
}
```

##### `getEventStats()`

Get event emission statistics.

```javascript
const eventStats = monitoringService.getEventStats();

console.log(`Total events: ${eventStats.totalEvents}`);
console.log(`Events/sec: ${eventStats.eventsPerSecond}`);
console.log('Events by type:', eventStats.eventsByType);
```

**Returns:**
```typescript
{
  totalEvents: number;
  eventsByType: Record<string, number>;
  lastReset: number; // timestamp
  eventsPerSecond: number;
}
```

##### `getEventLog(limit?)`

Get recent event log.

```javascript
const recentEvents = monitoringService.getEventLog(20);

recentEvents.forEach(event => {
  console.log(`[${new Date(event.timestamp).toISOString()}]`);
  console.log(`  Type: ${event.type}`);
  console.log(`  Data:`, event.data);
});
```

**Parameters:**
- `limit` (optional) - Number of events to return (default: 50)

**Returns:** `Array<EventLogEntry>`

##### `logEvent(eventType, data?)`

Manually log an event.

```javascript
monitoringService.logEvent('custom-action', {
  userId: 123,
  action: 'download',
  file: 'report.pdf'
});
```

##### `resetStats()`

Reset all statistics.

```javascript
monitoringService.resetStats();
```

##### `sendTestEvent(eventName?, data?)`

Send a test event to all connected clients.

```javascript
const result = monitoringService.sendTestEvent('ping', {
  server: 'production',
  timestamp: Date.now()
});

console.log(`Test event sent to ${result.recipients} clients`);
```

**Returns:**
```typescript
{
  success: boolean;
  eventName: string;
  data: any;
  recipients: number;
}
```

---

## Helper Functions

All helper functions are available on `strapi.$io`.

### `joinRoom(socketId, roomName)`

Add a socket to a room programmatically.

```javascript
const success = strapi.$io.joinRoom('abc123', 'premium-users');
if (success) {
  console.log('Socket joined room');
}
```

**Parameters:**
- `socketId: string` - Socket ID
- `roomName: string` - Room name

**Returns:** `boolean` - Success status

---

### `leaveRoom(socketId, roomName)`

Remove a socket from a room.

```javascript
strapi.$io.leaveRoom('abc123', 'premium-users');
```

**Parameters:**
- `socketId: string` - Socket ID
- `roomName: string` - Room name

**Returns:** `boolean` - Success status

---

### `getSocketsInRoom(roomName)`

Get all sockets in a specific room.

```javascript
const sockets = await strapi.$io.getSocketsInRoom('admin-panel');

sockets.forEach(socket => {
  console.log(`${socket.id} - ${socket.user?.username || 'anonymous'}`);
});
```

**Parameters:**
- `roomName: string` - Room name

**Returns:** `Promise<Array<{ id: string, user: User | null }>>`

---

### `sendPrivateMessage(socketId, event, data)`

Send a message to a specific socket.

```javascript
strapi.$io.sendPrivateMessage('abc123', 'notification', {
  type: 'success',
  message: 'Your payment was processed'
});
```

**Parameters:**
- `socketId: string` - Target socket ID
- `event: string` - Event name
- `data: any` - Event payload

---

### `broadcast(socketId, event, data)`

Broadcast from a socket to all others (excludes sender).

```javascript
strapi.$io.broadcast('abc123', 'user-typing', {
  username: 'john_doe',
  room: 'chat-1'
});
```

**Parameters:**
- `socketId: string` - Sender socket ID
- `event: string` - Event name
- `data: any` - Event payload

---

### `emitToNamespace(namespace, event, data)`

Emit event to all clients in a namespace.

```javascript
strapi.$io.emitToNamespace('admin', 'system-alert', {
  severity: 'high',
  message: 'Database backup required'
});
```

**Parameters:**
- `namespace: string` - Namespace name
- `event: string` - Event name
- `data: any` - Event payload

---

### `disconnectSocket(socketId, reason?)`

Force disconnect a socket.

```javascript
const disconnected = strapi.$io.disconnectSocket('abc123', 'policy violation');
if (disconnected) {
  console.log('Socket disconnected');
}
```

**Parameters:**
- `socketId: string` - Socket ID
- `reason: string` (optional) - Disconnect reason

**Returns:** `boolean` - Success status

---

## Client API

### Connection

#### Basic Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337', {
  transports: ['websocket', 'polling']
});
```

#### Authenticated Connection (JWT)

```javascript
const socket = io('http://localhost:1337', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
});
```

#### Connection with Query Parameters

```javascript
const socket = io('http://localhost:1337', {
  query: {
    token: 'your-jwt-token',
    clientId: 'mobile-app'
  }
});
```

### Namespace Connection

```javascript
const adminSocket = io('http://localhost:1337/admin', {
  auth: { token: 'your-jwt-token' }
});

const chatSocket = io('http://localhost:1337/chat');
```

### Room Management

#### Join Room

```javascript
socket.emit('join-room', 'premium-users', (response) => {
  if (response.success) {
    console.log(`Joined room: ${response.room}`);
  } else {
    console.error('Failed to join:', response.error);
  }
});
```

#### Leave Room

```javascript
socket.emit('leave-room', 'premium-users', (response) => {
  if (response.success) {
    console.log(`Left room: ${response.room}`);
  }
});
```

#### Get Joined Rooms

```javascript
socket.emit('get-rooms', (response) => {
  console.log('Currently in rooms:', response.rooms);
});
```

### Private Messages

```javascript
socket.emit('private-message', {
  to: 'target-socket-id',
  message: 'Hello!'
}, (response) => {
  if (response.success) {
    console.log('Message sent');
  } else {
    console.error('Failed:', response.error);
  }
});

// Receive private messages
socket.on('private-message', (data) => {
  console.log(`From ${data.fromUser}:`, data.message);
  console.log(`Timestamp: ${data.timestamp}`);
});
```

### Content Type Events

Listen for real-time content updates:

```javascript
// Create events
socket.on('article:create', (data) => {
  console.log('New article:', data);
  // data.id, data.attributes, data.meta
});

// Update events
socket.on('article:update', (data) => {
  console.log('Article updated:', data);
});

// Delete events
socket.on('article:delete', (data) => {
  console.log('Article deleted:', data);
  // data.id
});
```

### Connection Events

```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

---

## TypeScript Definitions

### Type Imports

```typescript
import type { Server, Socket, Namespace } from 'socket.io';

// Plugin types
interface SocketIOPlugin {
  server: Server;
  namespaces: Record<string, Namespace>;
  emit(options: EmitOptions): Promise<void>;
  raw(options: RawEmitOptions): Promise<void>;
  joinRoom(socketId: string, roomName: string): boolean;
  leaveRoom(socketId: string, roomName: string): boolean;
  getSocketsInRoom(roomName: string): Promise<SocketInfo[]>;
  sendPrivateMessage(socketId: string, event: string, data: any): void;
  broadcast(socketId: string, event: string, data: any): void;
  emitToNamespace(namespace: string, event: string, data: any): void;
  disconnectSocket(socketId: string, reason?: string): boolean;
}

// Extend Strapi global
declare module '@strapi/strapi' {
  export interface Strapi {
    $io: SocketIOPlugin;
    $ioSettings: PluginSettings;
  }
}
```

### Settings Types

```typescript
interface PluginSettings {
  enabled: boolean;
  
  cors: {
    origins: string[];
  };
  
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
    list: Record<string, NamespaceConfig>;
  };
  
  monitoring: {
    enableConnectionLogging: boolean;
    enableEventLogging: boolean;
    maxEventLogSize: number;
  };
}

interface RolePermission {
  canConnect: boolean;
  allowCredentials: boolean;
  allowedMethods: string[];
  contentTypes: Record<string, ContentTypeActions>;
}

interface ContentTypeActions {
  create: boolean;
  update: boolean;
  delete: boolean;
}

interface NamespaceConfig {
  requireAuth: boolean;
}
```

### Usage in Controllers

```typescript
// src/api/article/controllers/article.ts
import type { Core } from '@strapi/strapi';

export default {
  async create(ctx) {
    const response = await super.create(ctx);
    
    // Emit custom event
    strapi.$io.raw({
      event: 'article:published',
      data: {
        id: response.data.id,
        title: response.data.attributes.title,
        author: ctx.state.user.username
      }
    });
    
    return response;
  },
  
  async sendNotification(ctx) {
    const { socketId, message } = ctx.request.body;
    
    strapi.$io.sendPrivateMessage(socketId, 'notification', {
      type: 'info',
      message,
      timestamp: Date.now()
    });
    
    return { success: true };
  }
};
```

---

## Event Reference

### System Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connection` | Server | Client connected |
| `disconnect` | Server | Client disconnected |
| `connect` | Client | Successfully connected |
| `connect_error` | Client | Connection failed |
| `error` | Both | Socket error occurred |

### Content Type Events

Format: `{contentType}:{action}`

**Examples:**
- `article:create` - Article created
- `article:update` - Article updated
- `article:delete` - Article deleted
- `comment:create` - Comment created
- `user:update` - User updated

**With Custom Names** (when `events.customEventNames: true`):
- `article:created`
- `article:updated`
- `article:deleted`

### Room Events

| Event | Direction | Parameters | Description |
|-------|-----------|------------|-------------|
| `join-room` | Client → Server | `(roomName, callback)` | Join a room |
| `leave-room` | Client → Server | `(roomName, callback)` | Leave a room |
| `get-rooms` | Client → Server | `(callback)` | Get joined rooms |

### Private Message Events

| Event | Direction | Parameters | Description |
|-------|-----------|------------|-------------|
| `private-message` | Client → Server | `({ to, message }, callback)` | Send private message |
| `private-message` | Server → Client | `({ from, fromUser, message, timestamp })` | Receive private message |

---

## Usage Examples

### Example 1: Notify Users on Order Creation

```javascript
// src/api/order/content-types/order/lifecycles.js
module.exports = {
  async afterCreate(event) {
    const { result } = event;
    
    // Get customer socket
    const sockets = await strapi.$io.getSocketsInRoom(`user-${result.customer.id}`);
    
    if (sockets.length > 0) {
      strapi.$io.sendPrivateMessage(sockets[0].id, 'order:created', {
        orderId: result.id,
        total: result.total,
        status: 'pending'
      });
    }
    
    // Notify admin namespace
    strapi.$io.emitToNamespace('admin', 'new-order', {
      orderId: result.id,
      customer: result.customer.username,
      total: result.total
    });
  }
};
```

### Example 2: Real-time Chat System

```javascript
// Server-side custom route
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/chat/send',
      handler: 'chat.send',
      config: {
        auth: true
      }
    }
  ]
};

// Controller
module.exports = {
  async send(ctx) {
    const { roomName, message } = ctx.request.body;
    const user = ctx.state.user;
    
    // Save message to database
    const chatMessage = await strapi.entityService.create('api::message.message', {
      data: {
        content: message,
        room: roomName,
        author: user.id
      }
    });
    
    // Broadcast to room
    strapi.$io.server.to(roomName).emit('chat:message', {
      id: chatMessage.id,
      content: message,
      author: {
        id: user.id,
        username: user.username
      },
      timestamp: Date.now()
    });
    
    return { success: true };
  }
};
```

### Example 3: Admin Dashboard Live Stats

```javascript
// Scheduled job (using node-cron or similar)
const cron = require('node-cron');

// Update admin dashboard every 10 seconds
cron.schedule('*/10 * * * * *', async () => {
  const monitoringService = strapi.plugin('io').service('monitoring');
  const stats = monitoringService.getConnectionStats();
  
  // Count content by type
  const articleCount = await strapi.db.query('api::article.article').count();
  const userCount = await strapi.db.query('plugin::users-permissions.user').count();
  
  strapi.$io.emitToNamespace('admin', 'stats:update', {
    connections: stats.connected,
    articles: articleCount,
    users: userCount,
    timestamp: Date.now()
  });
});
```

### Example 4: Graceful Socket Management

```javascript
// src/index.js
module.exports = {
  async bootstrap({ strapi }) {
    // Handle server shutdown
    process.on('SIGTERM', async () => {
      console.log('Disconnecting all sockets...');
      
      const stats = strapi.plugin('io').service('monitoring').getConnectionStats();
      
      // Notify all clients
      strapi.$io.server.emit('server:shutdown', {
        message: 'Server is restarting',
        reconnectIn: 5000
      });
      
      // Disconnect all
      stats.sockets.forEach(socket => {
        strapi.$io.disconnectSocket(socket.id, 'server shutdown');
      });
    });
  }
};
```

---

## Best Practices

### 1. Use Rooms for Targeting

```javascript
// ❌ Bad: Loop through all sockets
strapi.$io.server.sockets.sockets.forEach(socket => {
  if (socket.user?.role === 'admin') {
    socket.emit('admin:notification', data);
  }
});

// ✅ Good: Use rooms
strapi.$io.server.to('admin-room').emit('admin:notification', data);
```

### 2. Handle Errors Gracefully

```javascript
socket.on('custom-action', async (data, callback) => {
  try {
    const result = await processAction(data);
    callback({ success: true, result });
  } catch (error) {
    strapi.log.error('Action failed:', error);
    callback({ success: false, error: error.message });
  }
});
```

### 3. Validate Input

```javascript
socket.on('join-room', (roomName, callback) => {
  // Validate
  if (typeof roomName !== 'string' || roomName.length === 0) {
    return callback({ success: false, error: 'Invalid room name' });
  }
  
  // Sanitize
  const sanitized = roomName.replace(/[^a-zA-Z0-9-_]/g, '');
  
  socket.join(sanitized);
  callback({ success: true, room: sanitized });
});
```

### 4. Monitor Performance

```javascript
// Log connection stats every minute
setInterval(() => {
  const monitoringService = strapi.plugin('io').service('monitoring');
  const stats = monitoringService.getConnectionStats();
  const events = monitoringService.getEventStats();
  
  strapi.log.info(`Socket.IO Stats: ${stats.connected} connections, ${events.eventsPerSecond} events/sec`);
}, 60000);
```

---

## Troubleshooting

### Check if Socket.IO is initialized

```javascript
if (!strapi.$io) {
  console.error('Socket.IO not initialized');
  return;
}
```

### Debug connection issues

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  
  // Common issues:
  // - CORS origin not allowed
  // - Authentication token invalid
  // - Server not running
  // - Max connections reached
});
```

### Verify settings

```javascript
const settings = await strapi.plugin('io').service('settings').getSettings();
console.log('Settings:', JSON.stringify(settings, null, 2));
```

---

## Performance Tips

1. **Use Namespaces** for logical separation (e.g., `/admin`, `/chat`)
2. **Enable Redis** for horizontal scaling across multiple servers
3. **Limit Event Logging** in production (`monitoring.enableEventLogging: false`)
4. **Use Rate Limiting** to prevent abuse
5. **Set Connection Limits** based on your server capacity
6. **Monitor Stats** regularly to detect issues early

---

## Support

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/ComfortablyCoding/strapi-plugin-io/issues
- Documentation: https://strapi-plugin-io.netlify.app/

---

**Last Updated:** 2025-11-26  
**Plugin Version:** 3.x.x  
**Strapi Version:** 5.x.x
