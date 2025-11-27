# Plugin Configuration

Complete reference for all Socket.IO plugin configuration options in `config/plugins.js`.

---

## Configuration Structure

```javascript
module.exports = ({ env }) => ({
	io: {
		enabled: true,
		config: {
      // Content type monitoring
      contentTypes: [],
      
      // Server socket options
      socket: {},
      
      // Custom server events
      events: [],
      
      // Lifecycle hooks
      hooks: {},
      
      // Admin settings (configured via admin panel)
      // cors, security, monitoring, etc.
    }
  }
});
```

---

## `contentTypes`

**Type:** `Array<string | ContentTypeConfig>`  
**Default:** `[]`

Defines which content types should automatically emit real-time events on CRUD operations.

### Simple Format

```javascript
contentTypes: [
  'api::article.article',
  'api::comment.comment',
  'api::product.product'
]
```

All CRUD events (`create`, `update`, `delete`) are emitted for these content types.

### Advanced Format

Control which specific actions trigger events:

```javascript
contentTypes: [
  // All actions
  'api::article.article',
  
  // Specific actions only
  {
    uid: 'api::product.product',
    actions: ['create', 'update']  // No delete events
  },
  
  // Custom event names
  {
    uid: 'api::comment.comment',
    actions: ['create'],
    eventPrefix: 'new-comment'  // Emits as 'new-comment:create'
  },
  
  // Include relations
  {
    uid: 'api::article.article',
    actions: ['create', 'update'],
    populate: ['author', 'category', 'tags']
  }
]
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `uid` | `string` | Content type UID (e.g., `'api::article.article'`) |
| `actions` | `string[]` | Actions to monitor: `['create', 'update', 'delete']` |
| `eventPrefix` | `string` | Custom event name prefix (default: content type name) |
| `populate` | `string[]` | Relations to populate in emitted data |

### Event Format

Events are emitted as: `{contentType}:{action}`

```javascript
// With contentTypes: ['api::article.article']
socket.on('article:create', (data) => { /* ... */ });
socket.on('article:update', (data) => { /* ... */ });
socket.on('article:delete', (data) => { /* ... */ });
```

---

## `socket`

**Type:** `object`  
**Default:**

```javascript
{
  serverOptions: {
    cors: {
      origin: 'http://localhost:1337',
      methods: ['GET']
		}
	}
}
```

### Properties

#### `serverOptions`

Direct pass-through to [Socket.IO Server Options](https://socket.io/docs/v4/server-options/).

```javascript
socket: {
  serverOptions: {
    // CORS configuration
    cors: {
      origin: env('CLIENT_URL', 'http://localhost:3000'),
      methods: ['GET', 'POST'],
      credentials: true
    },
    
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e6,
    
    // Transports
    transports: ['websocket', 'polling'],
    
    // Path (default: /socket.io)
    path: '/socket.io'
  }
}
```

### Common Configurations

::: code-group

```javascript [Development]
socket: {
  serverOptions: {
    cors: {
      origin: '*',  // Allow all origins
      methods: ['GET', 'POST']
    }
  }
}
```

```javascript [Production]
			socket: {
				serverOptions: {
    cors: {
      origin: [
        'https://example.com',
        'https://www.example.com',
        'https://app.example.com'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket']  // Faster, disable polling
  }
}
```

```javascript [Custom Path]
socket: {
  serverOptions: {
    path: '/api/realtime',  // Access at /api/realtime instead of /socket.io
    cors: {
      origin: env('CLIENT_URL')
    }
  }
}
```

:::

---

## `events`

**Type:** `Array<EventConfig>`  
**Default:** `[]`

Define custom server-side Socket.IO event handlers.

### Event Structure

```javascript
events: [
  {
    name: 'event-name',
    handler: ({ strapi, io }, socket, ...args) => {
      // Handle event
    }
  }
]
```

### Handler Signature

```typescript
handler(
  context: {
    strapi: Strapi;  // Global Strapi instance
    io: SocketIO;    // Socket.IO plugin instance
  },
  socket: Socket,    // Client socket that emitted event
  ...args: any[]     // Arguments sent with the event
): void | Promise<void>
```

### Examples

::: code-group

```javascript [Connection Event]
events: [
  {
    name: 'connection',
    handler({ strapi, io }, socket) {
      strapi.log.info(`[io] Socket connected: ${socket.id}`);
      
      // Send welcome message
      socket.emit('welcome', {
        message: 'Connected to Strapi!',
        timestamp: Date.now()
      });
    }
  }
]
```

```javascript [Disconnect Event]
events: [
  {
    name: 'disconnect',
    handler({ strapi }, socket, reason) {
      strapi.log.info(`[io] Socket ${socket.id} disconnected: ${reason}`);
      
      // Clean up user session
      // Update last seen, etc.
    }
  }
]
```

```javascript [Custom Event]
events: [
  {
    name: 'chat:message',
    handler({ strapi, io }, socket, message) {
      // Validate message
      if (!message.text || message.text.length > 500) {
        socket.emit('error', { message: 'Invalid message' });
        return;
      }
      
      // Broadcast to room
      io.server.to(message.room).emit('chat:message', {
        id: socket.id,
        text: message.text,
        timestamp: Date.now()
      });
    }
  }
]
```

```javascript [Typing Indicator]
events: [
  {
    name: 'typing:start',
    handler({ strapi, io }, socket, { roomId }) {
      // Notify others in room
      socket.to(roomId).emit('user:typing', {
        userId: socket.data.userId,
        roomId
      });
    }
  },
  {
    name: 'typing:stop',
    handler({ strapi, io }, socket, { roomId }) {
      socket.to(roomId).emit('user:stopped-typing', {
        userId: socket.data.userId,
        roomId
      });
    }
  }
]
```

```javascript [Room Management]
events: [
  {
    name: 'room:join',
    async handler({ strapi, io }, socket, { roomId }) {
      // Check permission
      const hasAccess = await strapi
        .plugin('io')
        .service('permissions')
        .canAccessRoom(socket.data.userId, roomId);
      
      if (!hasAccess) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }
      
      // Join room
      socket.join(roomId);
      
      // Notify others
      socket.to(roomId).emit('user:joined', {
        userId: socket.data.userId,
        roomId
      });
      
      // Send room history
      const history = await fetchRoomHistory(roomId);
      socket.emit('room:history', history);
    }
  }
]
```

:::

### Built-in Events

These events are automatically handled by Socket.IO:

- `connection` - New socket connected
- `disconnect` - Socket disconnected
- `error` - Error occurred
- `connect_error` - Connection error

---

## `hooks`

**Type:** `object`  
**Default:** `{}`

Lifecycle hooks called at specific points in the plugin lifecycle.

### `init`

Called immediately after the Socket.IO server instance is created. Perfect for adding adapters or middleware.

**Signature:**

```typescript
init(context: {
  strapi: Strapi;
  io: SocketIO;
}): void | Promise<void>
```

### Examples

::: code-group

```javascript [Redis Adapter]
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

module.exports = {
  io: {
    enabled: true,
    config: {
      hooks: {
        async init({ strapi, io }) {
          // Setup Redis adapter for scaling
          const pubClient = createClient({
            url: process.env.REDIS_URL
          });
          
          const subClient = pubClient.duplicate();
          
          await Promise.all([
            pubClient.connect(),
            subClient.connect()
          ]);
          
          io.server.adapter(createAdapter(pubClient, subClient));
          
          strapi.log.info('[io] Redis adapter initialized');
        }
      }
    }
  }
};
```

```javascript [MongoDB Adapter]
const { MongoClient } = require('mongodb');
const { createAdapter } = require('@socket.io/mongo-adapter');

module.exports = {
  io: {
    enabled: true,
    config: {
      hooks: {
        async init({ strapi, io }) {
          const mongoClient = new MongoClient(process.env.MONGO_URL);
          await mongoClient.connect();
          
          const mongoCollection = mongoClient
            .db('mydb')
            .collection('socket.io-adapter-events');
          
          io.server.adapter(createAdapter(mongoCollection));
          
          strapi.log.info('[io] MongoDB adapter initialized');
        }
      }
    }
  }
};
```

```javascript [Custom Middleware]
module.exports = {
  io: {
    enabled: true,
    config: {
      hooks: {
        init({ strapi, io }) {
          // Add custom middleware
          io.server.use((socket, next) => {
            // Log all connections
            strapi.log.info(`Connection attempt from ${socket.handshake.address}`);
            
            // Add custom data
            socket.data.connectedAt = Date.now();
            
            next();
          });
          
          strapi.log.info('[io] Custom middleware registered');
        }
      }
    }
  }
};
```

```javascript [Rate Limiting]
const rateLimit = require('socket.io-rate-limit');

module.exports = {
  io: {
    enabled: true,
    config: {
      hooks: {
        init({ strapi, io }) {
          // Apply rate limiting
          io.server.use(rateLimit({
            tokensPerInterval: 100,
            interval: 60000,  // 100 requests per minute
            fireImmediately: true
          }));
          
          strapi.log.info('[io] Rate limiting enabled');
        }
      }
    }
  }
};
```

:::

---

## Complete Example

Here's a comprehensive configuration example:

```javascript
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

module.exports = ({ env }) => ({
	io: {
		enabled: true,
		config: {
      // Monitor content types
      contentTypes: [
        'api::article.article',
        'api::comment.comment',
        {
          uid: 'api::product.product',
          actions: ['create', 'update'],
          populate: ['category', 'images']
        }
      ],
      
      // Socket.IO server options
      socket: {
        serverOptions: {
          cors: {
            origin: env('CLIENT_URL', 'http://localhost:3000'),
            methods: ['GET', 'POST'],
            credentials: true
          },
          transports: ['websocket', 'polling'],
          pingTimeout: 60000,
          pingInterval: 25000
        }
      },
      
      // Custom events
      events: [
        {
          name: 'connection',
          handler({ strapi }, socket) {
            strapi.log.info(`[io] Connected: ${socket.id}`);
            socket.emit('welcome', { serverTime: Date.now() });
          }
        },
        {
          name: 'disconnect',
          handler({ strapi }, socket, reason) {
            strapi.log.info(`[io] Disconnected: ${socket.id} (${reason})`);
          }
        },
        {
          name: 'chat:message',
          async handler({ strapi, io }, socket, data) {
            // Validate & save message
            const message = await strapi.entityService.create(
              'api::message.message',
              { data: { text: data.text, user: socket.data.userId } }
            );
            
            // Broadcast to room
            io.server.to(data.room).emit('chat:message', message);
          }
        }
      ],
      
      // Lifecycle hooks
      hooks: {
        async init({ strapi, io }) {
          // Setup Redis adapter for horizontal scaling
          if (env('REDIS_URL')) {
            const pubClient = createClient({ url: env('REDIS_URL') });
					const subClient = pubClient.duplicate();
            
            await Promise.all([
              pubClient.connect(),
              subClient.connect()
            ]);
            
            io.server.adapter(createAdapter(pubClient, subClient));
            strapi.log.info('[io] Redis adapter initialized');
          }
          
          // Custom middleware
          io.server.use((socket, next) => {
            socket.data.connectedAt = Date.now();
            next();
          });
        }
      }
    }
  }
});
```

---

## Environment Variables

Recommended `.env` configuration:

```bash
# Client URL for CORS
CLIENT_URL=http://localhost:3000

# Production client URLs (comma-separated)
CLIENT_URLS=https://example.com,https://www.example.com

# Redis URL for adapter (optional)
REDIS_URL=redis://localhost:6379

# Socket.IO configuration
SOCKET_IO_PATH=/socket.io
SOCKET_IO_PING_TIMEOUT=60000
SOCKET_IO_PING_INTERVAL=25000
```

Use in config:

```javascript
socket: {
  serverOptions: {
    cors: {
      origin: env.array('CLIENT_URLS', ['http://localhost:3000'])
    },
    path: env('SOCKET_IO_PATH', '/socket.io'),
    pingTimeout: env.int('SOCKET_IO_PING_TIMEOUT', 60000),
    pingInterval: env.int('SOCKET_IO_PING_INTERVAL', 25000)
  }
}
```

---

## Admin Panel Settings

Additional settings configured via the admin panel:

**Settings → Socket.IO**

![Admin Panel Settings](/settings.png)

Configure visually:

- **Security**
  - Rate limiting
  - IP whitelisting
  - Authentication requirements
  
- **Monitoring**
  - Connection logs
  - Event tracking
  - Performance metrics

![Monitoring Dashboard](/monitoringSettings.png)

The monitoring dashboard provides:
- Real-time connection list
- Active user details
- Event logs with timestamps
- Performance statistics
- Connection history
  
- **Namespaces**
  - Create isolated channels
  - Separate admin/public connections
  
- **Role Permissions**
  - Control content type access per role
  - Custom event permissions

---

## See Also

- **[IO Class API](/api/io-class)** - Available methods and properties
- **[Examples](/examples/)** - Real-world configurations
- **[Socket.IO Documentation](https://socket.io/docs/v4/)** - Official Socket.IO docs
