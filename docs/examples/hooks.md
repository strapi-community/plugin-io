# Hooks Examples

Learn how to use lifecycle hooks for initialization, adapters, and custom middleware.

---

## Overview

Hooks are similar to Strapi model lifecycles. They are functions called at specific points in the Socket.IO plugin lifecycle.

---

## Init Hook

The `init` hook is triggered immediately after the Socket.IO server instance is constructed. It's perfect for:
- Adding server adapters (Redis, MongoDB)
- Registering middleware
- Configuring namespaces
- Setting up custom logic

### Signature

```typescript
init(context: {
  strapi: Strapi;
  io: SocketIOInstance;
}): void | Promise<void>
```

---

## Redis Adapter

Scale your Socket.IO server across multiple instances using Redis:

```javascript
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
      hooks: {
        async init({ strapi, io }) {
          const pubClient = createClient({
            url: env('REDIS_URL', 'redis://localhost:6379')
          });
          
          const subClient = pubClient.duplicate();
          
          await Promise.all([
            pubClient.connect(),
            subClient.connect()
          ]);
          
          io.server.adapter(createAdapter(pubClient, subClient));
          
          strapi.log.info('[io] ✅ Redis adapter initialized');
          
          // Handle errors
          pubClient.on('error', (err) => {
            strapi.log.error('[io] Redis pub client error:', err);
          });
          
          subClient.on('error', (err) => {
            strapi.log.error('[io] Redis sub client error:', err);
          });
        }
      }
    }
  }
});
```

**Benefits:**
- ✅ Horizontal scaling across multiple servers
- ✅ Load balancing
- ✅ Session persistence
- ✅ High availability

---

## MongoDB Adapter

Use MongoDB as the adapter for distributed Socket.IO:

```javascript
const { MongoClient } = require('mongodb');
const { createAdapter } = require('@socket.io/mongo-adapter');

module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      hooks: {
        async init({ strapi, io }) {
          const mongoClient = new MongoClient(env('MONGO_URL'));
          await mongoClient.connect();
          
          const mongoCollection = mongoClient
            .db('mydb')
            .collection('socket.io-adapter-events');
          
          io.server.adapter(createAdapter(mongoCollection, {
            addCreatedAtField: true
          }));
          
          strapi.log.info('[io] ✅ MongoDB adapter initialized');
        }
      }
    }
  }
});
```

---

## Custom Middleware

Add authentication, logging, or rate limiting middleware:

### Authentication Middleware

```javascript
module.exports = {
  io: {
    enabled: true,
    config: {
      hooks: {
        init({ strapi, io }) {
          io.server.use(async (socket, next) => {
            try {
              const token = socket.handshake.auth.token;
              
              if (!token) {
                return next(new Error('Authentication required'));
              }
              
              // Verify JWT token
              const user = await strapi.plugins['users-permissions']
                .services.jwt.verify(token);
              
              if (!user) {
                return next(new Error('Invalid token'));
              }
              
              // Attach user to socket
              socket.data.user = user;
              
              next();
            } catch (error) {
              next(new Error('Authentication failed'));
            }
          });
          
          strapi.log.info('[io] Authentication middleware registered');
        }
      }
    }
  }
};
```

### Logging Middleware

```javascript
hooks: {
  init({ strapi, io }) {
    io.server.use((socket, next) => {
      strapi.log.info('[io] Connection attempt:', {
        socketId: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      
      // Add connection timestamp
      socket.data.connectedAt = Date.now();
      
      next();
    });
  }
}
```

### IP Whitelisting Middleware

```javascript
hooks: {
  init({ strapi, io }) {
    const allowedIPs = [
      '127.0.0.1',
      '::1',
      '192.168.1.0/24'
    ];
    
    io.server.use((socket, next) => {
      const clientIP = socket.handshake.address;
      
      if (!isIPAllowed(clientIP, allowedIPs)) {
        strapi.log.warn(`[io] Blocked connection from ${clientIP}`);
        return next(new Error('IP not whitelisted'));
      }
      
      next();
    });
  }
}
```

### Rate Limiting Middleware

```javascript
const rateLimit = require('socket.io-rate-limit');

hooks: {
  init({ strapi, io }) {
    io.server.use(rateLimit({
      tokensPerInterval: 100,
      interval: 60000, // 100 requests per minute
      fireImmediately: true,
      onLimitReached: (socket) => {
        strapi.log.warn(`[io] Rate limit exceeded: ${socket.id}`);
        socket.emit('error', {
          message: 'Too many requests. Please slow down.'
        });
      }
    }));
    
    strapi.log.info('[io] Rate limiting enabled');
  }
}
```

---

## Namespaces

Create separate communication channels:

```javascript
hooks: {
  init({ strapi, io }) {
    // Admin namespace
    const adminNamespace = io.server.of('/admin');
    
    adminNamespace.use(async (socket, next) => {
      // Admin-only authentication
      const token = socket.handshake.auth.token;
      const user = await verifyAdminToken(token);
      
      if (!user || user.role.type !== 'admin') {
        return next(new Error('Admin access required'));
      }
      
      socket.data.user = user;
      next();
    });
    
    adminNamespace.on('connection', (socket) => {
      strapi.log.info(`[io] Admin connected: ${socket.data.user.username}`);
      
      socket.on('broadcast', (data) => {
        // Broadcast to all users
        io.server.emit('admin:announcement', data);
      });
    });
    
    // Chat namespace
    const chatNamespace = io.server.of('/chat');
    
    chatNamespace.on('connection', (socket) => {
      strapi.log.info('[io] Chat user connected');
      
      socket.on('message', (data) => {
        chatNamespace.emit('message', data);
      });
    });
    
    strapi.log.info('[io] Namespaces configured: /admin, /chat');
  }
}
```

**Client usage:**

```javascript
// Connect to admin namespace
const adminSocket = io('http://localhost:1337/admin', {
  auth: { token: adminToken }
});

// Connect to chat namespace
const chatSocket = io('http://localhost:1337/chat', {
  auth: { token: userToken }
});
```

---

## Monitoring & Analytics

### Connection Tracking

```javascript
hooks: {
  init({ strapi, io }) {
    const connections = new Map();
    
    io.server.on('connection', (socket) => {
      const connectionInfo = {
        socketId: socket.id,
        ip: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'],
        connectedAt: new Date(),
        userId: socket.data.user?.id
      };
      
      connections.set(socket.id, connectionInfo);
      
      // Log to database
      strapi.entityService.create('api::connection-log.connection-log', {
        data: connectionInfo
      });
      
      socket.on('disconnect', () => {
        const info = connections.get(socket.id);
        const duration = Date.now() - info.connectedAt.getTime();
        
        strapi.log.info(`[io] Session ended: ${socket.id} (${duration}ms)`);
        
        // Update log
        strapi.entityService.update('api::connection-log.connection-log', {
          where: { socketId: socket.id },
          data: {
            disconnectedAt: new Date(),
            duration
          }
        });
        
        connections.delete(socket.id);
      });
    });
    
    // Periodic stats logging
    setInterval(() => {
      strapi.log.info(`[io] Active connections: ${connections.size}`);
    }, 60000); // Every minute
  }
}
```

### Event Analytics

```javascript
hooks: {
  init({ strapi, io }) {
    const eventStats = new Map();
    
    // Intercept all events
    io.server.use((socket, next) => {
      socket.use((packet, next) => {
        const [eventName] = packet;
        
        // Track event
        const count = eventStats.get(eventName) || 0;
        eventStats.set(eventName, count + 1);
        
        next();
      });
      
      next();
    });
    
    // Report stats every 5 minutes
    setInterval(() => {
      const stats = Array.from(eventStats.entries())
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count);
      
      strapi.log.info('[io] Event statistics:', stats);
      
      // Reset stats
      eventStats.clear();
    }, 300000);
  }
}
```

---

## Auto-Join Rooms

Automatically join users to rooms based on their role or properties:

```javascript
hooks: {
  init({ strapi, io }) {
    io.server.on('connection', async (socket) => {
      if (!socket.data.user) return;
      
      const user = socket.data.user;
      
      // Join user-specific room
      socket.join(`user-${user.id}`);
      
      // Join role-based room
      socket.join(`role-${user.role.type}`);
      
      // Join premium room
      if (user.isPremium) {
        socket.join('premium');
      }
      
      // Join location-based rooms
      if (user.country) {
        socket.join(`country-${user.country}`);
      }
      
      strapi.log.info(`[io] User ${user.username} joined rooms:`, 
        Array.from(socket.rooms)
      );
    });
  }
}
```

---

## Graceful Shutdown

Handle server shutdown gracefully:

```javascript
hooks: {
  init({ strapi, io }) {
    const shutdown = async (signal) => {
      strapi.log.info(`[io] Received ${signal}, closing connections...`);
      
      // Notify all clients
      io.server.emit('server:shutdown', {
        message: 'Server is restarting',
        reconnectIn: 5000
      });
      
      // Wait for messages to be sent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Close all connections
      const sockets = await io.server.fetchSockets();
      sockets.forEach(socket => {
        socket.disconnect(true);
      });
      
      strapi.log.info(`[io] Closed ${sockets.length} connections`);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}
```

---

## Custom Room Logic

Implement complex room joining logic:

```javascript
hooks: {
  init({ strapi, io }) {
    io.server.on('connection', (socket) => {
      socket.on('join-channel', async ({ channelId, password }) => {
        try {
          // Fetch channel
          const channel = await strapi.entityService.findOne(
            'api::channel.channel',
            channelId
          );
          
          if (!channel) {
            socket.emit('error', { message: 'Channel not found' });
            return;
          }
          
          // Check password if private
          if (channel.isPrivate && channel.password !== password) {
            socket.emit('error', { message: 'Invalid password' });
            return;
          }
          
          // Check member limit
          const roomSize = (await io.server.in(`channel-${channelId}`).fetchSockets()).length;
          if (channel.maxMembers && roomSize >= channel.maxMembers) {
            socket.emit('error', { message: 'Channel is full' });
            return;
          }
          
          // Join room
          socket.join(`channel-${channelId}`);
          
          // Notify others
          socket.to(`channel-${channelId}`).emit('user:joined', {
            userId: socket.data.user?.id,
            username: socket.data.user?.username
          });
          
          socket.emit('channel:joined', {
            channelId,
            members: roomSize + 1
          });
        } catch (error) {
          strapi.log.error('[io] Join channel error:', error);
          socket.emit('error', { message: 'Failed to join channel' });
        }
      });
    });
  }
}
```

---

## Helper Functions Integration

Add custom helper functions to the IO instance:

```javascript
hooks: {
  init({ strapi, io }) {
    // Add custom helper
    io.kickUser = async (userId, reason) => {
      const stats = strapi.plugin('io').service('monitoring').getConnectionStats();
      const userSocket = stats.sockets.find(s => s.user?.id === userId);
      
      if (userSocket) {
        io.server.to(userSocket.id).emit('kicked', { reason });
        io.disconnectSocket(userSocket.id, reason);
        return true;
      }
      
      return false;
    };
    
    // Add broadcast to role
    io.broadcastToRole = (roleName, event, data) => {
      io.server.to(`role-${roleName}`).emit(event, data);
    };
    
    strapi.log.info('[io] Custom helpers registered');
  }
}
```

**Usage:**

```javascript
// Kick abusive user
await strapi.$io.kickUser(123, 'Violation of terms');

// Broadcast to all admins
strapi.$io.broadcastToRole('admin', 'system:alert', {
  level: 'critical',
  message: 'Database backup required'
});
```

---

## Testing

```javascript
// test/hooks.test.js
describe('Socket.IO Hooks', () => {
  test('should have Redis adapter', async () => {
    const adapter = strapi.$io.server.adapter;
    expect(adapter.constructor.name).toBe('RedisAdapter');
  });
  
  test('should have custom helpers', () => {
    expect(typeof strapi.$io.kickUser).toBe('function');
    expect(typeof strapi.$io.broadcastToRole).toBe('function');
  });
  
  test('should auto-join user room', (done) => {
    const socket = io('http://localhost:1337', {
      auth: { token: userToken }
    });
    
    socket.on('connect', () => {
      // Verify user joined their room
      socket.emit('get-rooms', (rooms) => {
        expect(rooms).toContain(`user-${userId}`);
        done();
      });
    });
  });
});
```

---

## Best Practices

### ✅ Do

- Use adapters for production scaling
- Implement rate limiting
- Log important events
- Handle errors gracefully
- Clean up resources on disconnect
- Use TypeScript for complex logic

### ❌ Don't

- Block the event loop
- Store large objects in socket.data
- Forget to handle adapter errors
- Skip authentication middleware
- Leave connections open unnecessarily

---

## See Also

- **[Events](/examples/events)** - Custom event handlers
- **[Content Types](/examples/content-types)** - Automatic content events
- **[API Reference](/api/io-class)** - Core API methods
- **[Socket.IO Adapters](https://socket.io/docs/v4/adapter/)** - Official adapter docs
