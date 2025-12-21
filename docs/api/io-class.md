# IO Class API Reference

The `$io` class is the main Socket.IO instance available globally on the Strapi object (`strapi.$io`).

**Version:** 5.x for Strapi v5  
**TypeScript:** Full type definitions included

---

## Quick Reference

```typescript
// Access the Socket.IO instance
const io = strapi.$io;

// Core methods
io.emit({ event, schema, data });
io.raw({ event, rooms, data });

// Room management
io.joinRoom(socketId, roomName);
io.leaveRoom(socketId, roomName);
io.getSocketsInRoom(roomName);

// Messaging
io.sendPrivateMessage(socketId, event, data);
io.broadcast(socketId, event, data);
io.emitToNamespace(namespace, event, data);

// Connection management
io.disconnectSocket(socketId, reason);

// Entity subscriptions (new in v5.0)
io.subscribeToEntity(socketId, uid, id);
io.unsubscribeFromEntity(socketId, uid, id);
io.getEntitySubscriptions(socketId);
io.emitToEntity(uid, id, event, data);
io.getEntityRoomSockets(uid, id);

// Properties
io.server;           // Raw Socket.IO server
io.namespaces;       // All namespaces
```

---

## Core Properties

### `strapi.$io.server`

Direct access to the Socket.IO server instance.

**Type:** `Server` from `socket.io`

```javascript
// Get all connected sockets
const sockets = strapi.$io.server.sockets.sockets;
console.log(`Connected clients: ${sockets.size}`);

// Broadcast to everyone
strapi.$io.server.emit('announcement', {
  message: 'Server maintenance in 10 minutes'
});

// Access adapter and rooms
const rooms = strapi.$io.server.sockets.adapter.rooms;
console.log('Active rooms:', Array.from(rooms.keys()));
```

### `strapi.$io.namespaces`

Access all configured namespaces.

**Type:** `Record<string, Namespace>`

```javascript
// Emit to specific namespace
if (strapi.$io.namespaces.admin) {
  strapi.$io.namespaces.admin.emit('dashboard:update', {
    users: 1234,
    activeNow: 56
  });
}

// List all namespaces
Object.keys(strapi.$io.namespaces).forEach(ns => {
  console.log(`Namespace: ${ns}`);
});
```

---

## Core Methods

### `emit()`

Sends data to all roles/tokens with permission for the content type action. Automatically sanitizes and transforms data based on role permissions.

**Signature:**

```typescript
emit(options: EmitOptions): Promise<void>

interface EmitOptions {
  event: string;      // Action: 'create' | 'update' | 'delete' | custom
  schema: object;     // Content type schema
  data: any;          // Data to emit
}
```

**Supported Actions:** `create`, `update`, `delete` (or custom actions)

**Event Format:** `{contentType}:{action}` (e.g., `article:create`)

**Features:**
- ✅ Automatic permission checking
- ✅ Data sanitization per role
- ✅ Relation population (if configured)
- ✅ Transform output

::: code-group

```javascript [Built-in Action]
// Emit article creation event
strapi.$io.emit({
  event: 'create',
  schema: 'api::article.article',
  data: articleData
});

// Only users with 'create' permission on articles receive this
```

```javascript [Custom Action]
// Emit custom event with schema
strapi.$io.emit({
  event: 'publish',
  schema: 'api::article.article',
  data: { id: 123, status: 'published' }
});

// Receives as: socket.on('article:publish', ...)
```

```javascript [Controller Integration]
// In your controller
async create(ctx) {
  const entry = await strapi.entityService.create(
    'api::article.article',
    { data: ctx.request.body }
  );

  // Emit to all permitted users
  await strapi.$io.emit({
    event: 'create',
    schema: 'api::article.article',
    data: entry
  });
  
  return entry;
}
```

:::

### `raw()`

Emit events without permission checks or data sanitization. Use for custom events that don't relate to content types.

**Signature:**

```typescript
raw(options: RawEmitOptions): Promise<void>

interface RawEmitOptions {
  event: string;           // Any event name
  rooms?: string[];        // Optional: specific rooms
  data: any;              // Data to emit (not sanitized!)
}
```

::: warning
Data is **NOT** sanitized or transformed. Only send safe, pre-validated data!
:::

::: code-group

```javascript [Broadcast to All]
// Send to all connected clients
strapi.$io.raw({
  event: 'notification',
  data: {
    type: 'info',
    message: 'System maintenance completed'
  }
});
```

```javascript [Specific Rooms]
// Send only to premium users
strapi.$io.raw({
  event: 'exclusive-offer',
  rooms: ['premium', 'vip'],
  data: {
    discount: 50,
    expiresIn: '24h'
  }
});
```

```javascript [Custom Event]
// Send custom analytics event
strapi.$io.raw({
  event: 'analytics:pageview',
  data: {
    page: '/products',
    timestamp: Date.now(),
    visitors: 42
  }
});
```

:::

---

## Helper Functions

### `joinRoom()`

Add a socket to a room.

**Signature:**

```typescript
joinRoom(socketId: string, roomName: string): boolean
```

**Returns:** `true` if successful, `false` if socket not found

```javascript
// Add user to premium room after purchase
strapi.$io.joinRoom(socket.id, 'premium-users');

// Add to multiple rooms
['notifications', 'chat', 'updates'].forEach(room => {
  strapi.$io.joinRoom(socket.id, room);
});
```

### `leaveRoom()`

Remove a socket from a room.

**Signature:**

```typescript
leaveRoom(socketId: string, roomName: string): boolean
```

**Returns:** `true` if successful, `false` if socket not found

```javascript
// Remove from room on subscription end
strapi.$io.leaveRoom(socket.id, 'premium-users');

// Leave all custom rooms
const socket = strapi.$io.server.sockets.sockets.get(socketId);
if (socket) {
  socket.rooms.forEach(room => {
    if (room !== socket.id) {  // Don't leave own room
      strapi.$io.leaveRoom(socket.id, room);
    }
  });
}
```

### `getSocketsInRoom()`

Get all sockets in a specific room.

**Signature:**

```typescript
getSocketsInRoom(roomName: string): Promise<SocketInfo[]>

interface SocketInfo {
  id: string;
  userId?: number;
  role?: string;
  rooms: string[];
}
```

```javascript
// Check who's in a chat room
const sockets = await strapi.$io.getSocketsInRoom('chat-lobby');
console.log(`${sockets.length} users in lobby`);

sockets.forEach(socket => {
  console.log(`Socket ${socket.id}, User: ${socket.userId}`);
});

// Check if room is empty before closing it
if (sockets.length === 0) {
  console.log('Chat room is empty, closing...');
}
```

### `sendPrivateMessage()`

Send a message to a specific socket only.

**Signature:**

```typescript
sendPrivateMessage(
  socketId: string,
  event: string,
  data: any
): void
```

```javascript
// Send private notification
strapi.$io.sendPrivateMessage(
  socket.id,
  'private-notification',
  {
    type: 'success',
    message: 'Your payment was processed'
  }
);

// Send user-specific data
strapi.$io.sendPrivateMessage(
  socket.id,
  'user-stats',
  {
    points: 1250,
    level: 15,
    achievements: ['first-post', 'verified']
  }
);
```

### `broadcast()`

Emit to all sockets except the sender.

**Signature:**

```typescript
broadcast(
  socketId: string,
  event: string,
  data: any
): void
```

**Use Case:** Notify others about a user's action without notifying the user themselves.

```javascript
// User joined - notify others
strapi.$io.broadcast(socket.id, 'user-joined', {
  username: 'john_doe',
  avatar: '/avatars/john.png'
});

// User typing indicator
strapi.$io.broadcast(socket.id, 'typing', {
  userId: 123,
  chatRoom: 'general'
});

// Collaborative editing - sync changes to others
strapi.$io.broadcast(socket.id, 'document:update', {
  documentId: 456,
  changes: [{ op: 'insert', pos: 10, text: 'Hello' }]
});
```

### `emitToNamespace()`

Emit event to all sockets in a specific namespace.

**Signature:**

```typescript
emitToNamespace(
  namespace: string,
  event: string,
  data: any
): void
```

```javascript
// Update admin dashboard
strapi.$io.emitToNamespace('admin', 'dashboard:stats', {
  onlineUsers: 1234,
  revenue: 56789,
  orders: 42
});

// Send to chat namespace
strapi.$io.emitToNamespace('chat', 'announcement', {
  message: 'New features available!'
});
```

### `disconnectSocket()`

Forcefully disconnect a socket with optional reason.

**Signature:**

```typescript
disconnectSocket(
  socketId: string,
  reason?: string
): boolean
```

**Returns:** `true` if socket was found and disconnected

```javascript
// Kick abusive user
strapi.$io.disconnectSocket(socket.id, 'Violation of terms of service');

// Disconnect on account deletion
strapi.$io.disconnectSocket(socket.id, 'Account deleted');

// Session timeout
strapi.$io.disconnectSocket(socket.id, 'Session expired');
```

---

## Entity Subscription Functions

Entity subscriptions allow targeted updates for specific entities rather than receiving all events for a content type.

### `subscribeToEntity()`

Subscribe a socket to a specific entity (server-side).

**Signature:**

```typescript
subscribeToEntity(
  socketId: string,
  uid: string,
  id: string | number
): Promise<EntitySubscriptionResult>

interface EntitySubscriptionResult {
  success: boolean;
  room?: string;
  uid?: string;
  id?: string | number;
  error?: string;
}
```

```javascript
// Subscribe user to article updates
const result = await strapi.$io.subscribeToEntity(
  socket.id,
  'api::article.article',
  123
);

if (result.success) {
  console.log(`Subscribed to room: ${result.room}`);
}
```

### `unsubscribeFromEntity()`

Unsubscribe a socket from a specific entity.

**Signature:**

```typescript
unsubscribeFromEntity(
  socketId: string,
  uid: string,
  id: string | number
): EntitySubscriptionResult
```

```javascript
// Unsubscribe when user leaves article page
const result = strapi.$io.unsubscribeFromEntity(
  socket.id,
  'api::article.article',
  123
);
```

### `getEntitySubscriptions()`

Get all entity subscriptions for a socket.

**Signature:**

```typescript
getEntitySubscriptions(socketId: string): {
  success: boolean;
  subscriptions?: Array<{ uid: string; id: string; room: string }>;
  error?: string;
}
```

```javascript
// Check what entities a user is watching
const result = strapi.$io.getEntitySubscriptions(socket.id);

if (result.success) {
  result.subscriptions.forEach(sub => {
    console.log(`Watching: ${sub.uid} #${sub.id}`);
  });
}
```

### `emitToEntity()`

Emit an event to all clients subscribed to a specific entity.

**Signature:**

```typescript
emitToEntity(
  uid: string,
  id: string | number,
  event: string,
  data: any
): void
```

```javascript
// Notify all subscribers when article gets a new comment
strapi.$io.emitToEntity(
  'api::article.article',
  123,
  'article:commented',
  {
    commentId: 456,
    author: 'jane_doe',
    text: 'Great article!'
  }
);
```

### `getEntityRoomSockets()`

Get all sockets subscribed to a specific entity.

**Signature:**

```typescript
getEntityRoomSockets(
  uid: string,
  id: string | number
): Promise<Array<{ id: string; user: any }>>
```

```javascript
// Check who's watching an article
const sockets = await strapi.$io.getEntityRoomSockets(
  'api::article.article',
  123
);

console.log(`${sockets.length} users watching this article`);
sockets.forEach(s => {
  console.log(`User: ${s.user?.username || 'anonymous'}`);
});
```

---

## Event Format

All events follow a consistent format for easy handling.

### Server to Client

```typescript
// Content type events (from emit())
socket.on('article:create', (data) => {
  // data is sanitized based on user permissions
  console.log(data);
});

// Custom events (from raw())
socket.on('notification', (data) => {
  // data is exactly what was sent
  console.log(data);
});
```

### Client to Server

```javascript
// Emit custom event from client
socket.emit('custom-event', { foo: 'bar' });

// Listen on server (config in plugins.js)
events: [
  {
    name: 'custom-event',
    handler({ strapi, io }, socket, data) {
      console.log('Received:', data);
    }
  }
]
```

---

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import type { SocketIO, EmitOptions, RawEmitOptions } from '@strapi-community/plugin-io/types';

// Access with IntelliSense
const io: SocketIO = strapi.$io;

// Type-safe emit
const options: EmitOptions = {
  event: 'create',
  schema: 'api::article.article',
  data: articleData
};

await io.emit(options);
```

---

## Best Practices

### 1. Use `emit()` for Content Types

```javascript
// ✅ Good - automatic permissions
strapi.$io.emit({
  event: 'update',
  schema: 'api::article.article',
  data: updatedArticle
});

// ❌ Bad - no permission checking
strapi.$io.raw({
  event: 'article:update',
  data: updatedArticle
});
```

### 2. Use `raw()` for Custom Events

```javascript
// ✅ Good - doesn't relate to content type
strapi.$io.raw({
  event: 'server:status',
  data: { uptime: process.uptime() }
});
```

### 3. Clean Up Rooms

```javascript
// Remove from room when done
socket.on('disconnect', () => {
  strapi.$io.leaveRoom(socket.id, 'temporary-room');
});
```

### 4. Check Room Occupancy

```javascript
// Before sending expensive data
const sockets = await strapi.$io.getSocketsInRoom('dashboard');
if (sockets.length > 0) {
  // Only calculate if someone is watching
  const stats = await calculateExpensiveStats();
  strapi.$io.raw({
    event: 'stats:update',
    rooms: ['dashboard'],
    data: stats
  });
}
```

---

## See Also

- **[Plugin Configuration](/api/plugin-config)** - Configure events, hooks, and more
- **[Examples](/examples/)** - Real-world implementation patterns
- **[Helper Functions Guide](/examples/hooks#helper-functions)** - Detailed usage examples
