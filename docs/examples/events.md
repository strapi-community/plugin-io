# Events Examples

Learn how to register and handle custom Socket.IO events in your Strapi application.

---

## Overview

The `events` configuration registers [server-side Socket.IO events](https://socket.io/docs/v4/server-api/#events) that clients can emit and your server can handle.

---

## Built-in Events

### Connection Event

Automatically triggered whenever a client connects:

```javascript
module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      events: [
        {
          name: 'connection',
          handler({ strapi, io }, socket) {
            strapi.log.info(`[io] Client connected: ${socket.id}`);
            
            // Access user info (if authenticated)
            if (socket.data.user) {
              strapi.log.info(`User: ${socket.data.user.username}`);
            }
            
            // Send welcome message
            socket.emit('welcome', {
              message: 'Connected to Strapi!',
              serverTime: Date.now()
            });
          }
        }
      ]
    }
  }
});
```

### Disconnect Event

Triggered when a client disconnects:

```javascript
events: [
  {
    name: 'disconnect',
    handler({ strapi }, socket, reason) {
      strapi.log.info(`[io] Client ${socket.id} disconnected: ${reason}`);
      
      // Update user status
      if (socket.data.user) {
        strapi.entityService.update(
          'plugin::users-permissions.user',
          socket.data.user.id,
          { data: { isOnline: false, lastSeen: new Date() } }
        );
      }
    }
  }
]
```

---

## Custom Events

### Simple Custom Event

```javascript
events: [
  {
    name: 'ping',
    handler({ strapi }, socket) {
      strapi.log.info(`[io] Ping from ${socket.id}`);
      socket.emit('pong', { timestamp: Date.now() });
    }
  }
]
```

**Client:**

```javascript
socket.emit('ping');

socket.on('pong', (data) => {
  console.log('Server responded at:', data.timestamp);
});
```

### Event with Parameters

```javascript
events: [
  {
    name: 'update-user-name',
    async handler({ strapi }, socket, newName) {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        await strapi.entityService.update(
          'plugin::users-permissions.user',
          socket.data.user.id,
          { data: { username: newName } }
        );
        
        socket.emit('name-updated', { success: true, newName });
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    }
  }
]
```

**Client:**

```javascript
socket.emit('update-user-name', 'john_doe');

socket.on('name-updated', ({ success, newName }) => {
  if (success) {
    console.log('Name updated to:', newName);
  }
});
```

---

## Real-World Examples

### Chat Messages

```javascript
events: [
  {
    name: 'chat:send',
    async handler({ strapi, io }, socket, { roomId, message }) {
      // Validate
      if (!message || !roomId) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      if (message.length > 500) {
        socket.emit('error', { message: 'Message too long' });
        return;
      }
      
      // Save to database
      const chatMessage = await strapi.entityService.create(
        'api::message.message',
        {
          data: {
            content: message,
            room: roomId,
            author: socket.data.user.id,
            publishedAt: new Date()
          },
          populate: ['author']
        }
      );
      
      // Broadcast to room
      io.server.to(`room-${roomId}`).emit('chat:message', {
        id: chatMessage.id,
        content: message,
        author: {
          id: socket.data.user.id,
          username: socket.data.user.username,
          avatar: socket.data.user.avatar?.url
        },
        timestamp: Date.now()
      });
    }
  }
]
```

**Client:**

```javascript
// Send message
socket.emit('chat:send', {
  roomId: '123',
  message: 'Hello everyone!'
});

// Receive messages
socket.on('chat:message', (message) => {
  displayMessage(message);
});
```

### Typing Indicators

```javascript
events: [
  {
    name: 'typing:start',
    handler({ strapi, io }, socket, { roomId }) {
      if (!socket.data.user) return;
      
      // Broadcast to others in room
      socket.to(`room-${roomId}`).emit('user:typing', {
        userId: socket.data.user.id,
        username: socket.data.user.username,
        roomId
      });
    }
  },
  {
    name: 'typing:stop',
    handler({ strapi, io }, socket, { roomId }) {
      if (!socket.data.user) return;
      
      socket.to(`room-${roomId}`).emit('user:stopped-typing', {
        userId: socket.data.user.id,
        roomId
      });
    }
  }
]
```

**Client:**

```javascript
let typingTimeout;

messageInput.addEventListener('input', () => {
  socket.emit('typing:start', { roomId: currentRoom });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { roomId: currentRoom });
  }, 1000);
});

socket.on('user:typing', ({ username }) => {
  showTypingIndicator(username);
});

socket.on('user:stopped-typing', ({ userId }) => {
  hideTypingIndicator(userId);
});
```

### Room Management

```javascript
events: [
  {
    name: 'room:join',
    async handler({ strapi, io }, socket, { roomId }) {
      if (!socket.data.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      // Check permission
      const hasAccess = await checkRoomAccess(socket.data.user.id, roomId);
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }
      
      // Join room
      socket.join(`room-${roomId}`);
      
      // Notify others
      socket.to(`room-${roomId}`).emit('user:joined', {
        userId: socket.data.user.id,
        username: socket.data.user.username,
        avatar: socket.data.user.avatar?.url
      });
      
      // Send room history
      const messages = await strapi.entityService.findMany(
        'api::message.message',
        {
          filters: { room: roomId },
          sort: { createdAt: 'desc' },
          limit: 50,
          populate: ['author']
        }
      );
      
      socket.emit('room:history', { messages });
      socket.emit('room:joined', { roomId, success: true });
    }
  },
  {
    name: 'room:leave',
    handler({ strapi, io }, socket, { roomId }) {
      socket.leave(`room-${roomId}`);
      
      socket.to(`room-${roomId}`).emit('user:left', {
        userId: socket.data.user?.id,
        username: socket.data.user?.username
      });
      
      socket.emit('room:left', { roomId, success: true });
    }
  }
]
```

### Private Messages

```javascript
events: [
  {
    name: 'dm:send',
    async handler({ strapi, io }, socket, { toUserId, message }) {
      if (!socket.data.user) return;
      
      // Save message
      const dm = await strapi.entityService.create(
        'api::direct-message.direct-message',
        {
          data: {
            from: socket.data.user.id,
            to: toUserId,
            content: message,
            publishedAt: new Date()
          }
        }
      );
      
      // Find recipient's socket
      const stats = strapi.plugin('io').service('monitoring').getConnectionStats();
      const recipientSocket = stats.sockets.find(s => s.user?.id === toUserId);
      
      if (recipientSocket) {
        io.server.to(recipientSocket.id).emit('dm:received', {
          id: dm.id,
          from: {
            id: socket.data.user.id,
            username: socket.data.user.username,
            avatar: socket.data.user.avatar?.url
          },
          content: message,
          timestamp: Date.now()
        });
      }
      
      socket.emit('dm:sent', { success: true, messageId: dm.id });
    }
  }
]
```

### Online Presence

```javascript
events: [
  {
    name: 'connection',
    async handler({ strapi, io }, socket) {
      if (!socket.data.user) return;
      
      // Mark user as online
      await strapi.entityService.update(
        'plugin::users-permissions.user',
        socket.data.user.id,
        { data: { isOnline: true, lastSeen: new Date() } }
      );
      
      // Notify friends
      const friends = await getFriendsList(socket.data.user.id);
      const stats = strapi.plugin('io').service('monitoring').getConnectionStats();
      
      friends.forEach(friend => {
        const friendSocket = stats.sockets.find(s => s.user?.id === friend.id);
        if (friendSocket) {
          io.server.to(friendSocket.id).emit('friend:online', {
            userId: socket.data.user.id,
            username: socket.data.user.username
          });
        }
      });
    }
  },
  {
    name: 'disconnect',
    async handler({ strapi, io }, socket) {
      if (!socket.data.user) return;
      
      // Mark user as offline
      await strapi.entityService.update(
        'plugin::users-permissions.user',
        socket.data.user.id,
        { data: { isOnline: false, lastSeen: new Date() } }
      );
      
      // Notify friends
      const friends = await getFriendsList(socket.data.user.id);
      const stats = strapi.plugin('io').service('monitoring').getConnectionStats();
      
      friends.forEach(friend => {
        const friendSocket = stats.sockets.find(s => s.user?.id === friend.id);
        if (friendSocket) {
          io.server.to(friendSocket.id).emit('friend:offline', {
            userId: socket.data.user.id,
            username: socket.data.user.username
          });
        }
      });
    }
  }
]
```

---

## Error Handling

### Validate Input

```javascript
events: [
  {
    name: 'user:update',
    async handler({ strapi }, socket, data) {
      try {
        // Validate
        if (!data.field || !data.value) {
          throw new Error('Missing required fields');
        }
        
        // Sanitize
        const allowedFields = ['username', 'bio', 'avatar'];
        if (!allowedFields.includes(data.field)) {
          throw new Error('Field not allowed');
        }
        
        // Update
        await strapi.entityService.update(
          'plugin::users-permissions.user',
          socket.data.user.id,
          { data: { [data.field]: data.value } }
        );
        
        socket.emit('update:success', { field: data.field });
      } catch (error) {
        strapi.log.error('Update failed:', error);
        socket.emit('update:error', { message: error.message });
      }
    }
  }
]
```

### Rate Limiting

```javascript
const rateLimiters = new Map();

events: [
  {
    name: 'connection',
    handler({ strapi }, socket) {
      rateLimiters.set(socket.id, {
        count: 0,
        resetAt: Date.now() + 60000
      });
    }
  },
  {
    name: 'chat:send',
    handler({ strapi, io }, socket, data) {
      const limiter = rateLimiters.get(socket.id);
      const now = Date.now();
      
      // Reset counter
      if (now > limiter.resetAt) {
        limiter.count = 0;
        limiter.resetAt = now + 60000;
      }
      
      limiter.count++;
      
      // Check limit
      if (limiter.count > 20) {
        socket.emit('error', {
          message: 'Rate limit exceeded. Max 20 messages per minute.'
        });
        return;
      }
      
      // Process message...
    }
  },
  {
    name: 'disconnect',
    handler({ strapi }, socket) {
      rateLimiters.delete(socket.id);
    }
  }
]
```

---

## Testing

```javascript
// test/events.test.js
const { io } = require('socket.io-client');

describe('Custom Events', () => {
  let socket;
  
  beforeAll((done) => {
    socket = io('http://localhost:1337');
    socket.on('connect', done);
  });
  
  afterAll(() => {
    socket.disconnect();
  });
  
  test('should respond to ping', (done) => {
    socket.emit('ping');
    
    socket.on('pong', (data) => {
      expect(data).toHaveProperty('timestamp');
      done();
    });
  });
  
  test('should handle chat message', (done) => {
    socket.emit('chat:send', {
      roomId: 'test',
      message: 'Hello'
    });
    
    socket.on('chat:message', (message) => {
      expect(message.content).toBe('Hello');
      done();
    });
  });
});
```

---

## Best Practices

### ✅ Do

- Always validate and sanitize input
- Use try-catch for async operations
- Implement rate limiting
- Log errors for debugging
- Send meaningful error messages
- Use TypeScript for type safety

### ❌ Don't

- Trust client input without validation
- Expose sensitive data in events
- Block the event loop with heavy operations
- Forget to handle disconnections
- Emit events to wrong rooms

---

## See Also

- **[Content Types](/examples/content-types)** - Automatic content events
- **[Hooks](/examples/hooks)** - Lifecycle hooks
- **[API Reference](/api/io-class)** - Core API methods
