# @strapi-community/plugin-io

> Real-time WebSocket integration for Strapi v5 with Socket.IO

[![NPM Version](https://img.shields.io/npm/v/@strapi-community/plugin-io?style=flat-square)](https://www.npmjs.com/package/@strapi-community/plugin-io)
[![NPM Downloads](https://img.shields.io/npm/dm/@strapi-community/plugin-io?style=flat-square)](https://www.npmjs.com/package/@strapi-community/plugin-io)
[![License](https://img.shields.io/npm/l/@strapi-community/plugin-io?style=flat-square)](https://github.com/strapi-community/strapi-plugin-io/blob/main/LICENSE)
[![Strapi Version](https://img.shields.io/badge/strapi-v5-blueviolet?style=flat-square)](https://strapi.io)

Add real-time capabilities to your Strapi application with WebSocket support. Automatically broadcast content changes, manage user connections, and build live features like chat, notifications, and collaborative editing.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Authentication](#authentication)
- [Admin Panel](#admin-panel)
- [TypeScript Support](#typescript-support)
- [Performance](#performance)
- [Migration Guide](#migration-guide)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Functionality
- **Automatic Real-Time Events** - CRUD operations broadcast automatically to connected clients
- **Entity-Specific Subscriptions** - Subscribe to individual entities for targeted updates
- **Role-Based Access Control** - Built-in permission checks for JWT and API tokens
- **Multi-Client Support** - Handle 2500+ concurrent connections efficiently

### Developer Experience
- **Visual Admin Panel** - Configure everything through the Strapi admin interface
- **TypeScript Support** - Full type definitions for IntelliSense
- **Helper Functions** - 12+ utility methods for common tasks
- **Comprehensive Documentation** - Detailed guides and examples

### Production Ready
- **Redis Adapter** - Scale horizontally across multiple servers
- **Rate Limiting** - Prevent abuse with configurable limits
- **Monitoring Dashboard** - Live connection stats and event logs
- **Security Features** - IP whitelisting, authentication, input validation

---

## Quick Start

### 1. Install the plugin

```bash
npm install @strapi-community/plugin-io
```

### 2. Enable in your Strapi project

Create or update `config/plugins.js`:

```javascript
module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
      socket: {
        serverOptions: {
          cors: {
            origin: 'http://localhost:3000',
            methods: ['GET', 'POST']
          }
        }
      }
    }
  }
};
```

### 3. Start your Strapi server

```bash
npm run develop
```

### 4. Connect from your frontend

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337');

socket.on('article:create', (article) => {
  console.log('New article published:', article);
});

socket.on('article:update', (article) => {
  console.log('Article updated:', article);
});
```

That's it! Your application now has real-time updates.

---

## Installation

### Requirements

- **Node.js**: 18.x - 22.x
- **Strapi**: v5.x
- **npm**: 6.x or higher

### Install the package

```bash
# Using npm
npm install @strapi-community/plugin-io

# Using yarn
yarn add @strapi-community/plugin-io

# Using pnpm
pnpm add @strapi-community/plugin-io
```

---

## Configuration

### Basic Configuration

The simplest setup to get started:

```javascript
// config/plugins.js
module.exports = {
  io: {
    enabled: true,
    config: {
      // Monitor these content types for changes
      contentTypes: [
        'api::article.article',
        'api::comment.comment'
      ]
    }
  }
};
```

### Advanced Configuration

Fine-tune the plugin behavior:

```javascript
// config/plugins.js
module.exports = {
  io: {
    enabled: true,
    config: {
      // Content types with specific actions
      contentTypes: [
        {
          uid: 'api::article.article',
          actions: ['create', 'update'],  // Only these events
          populate: ['author', 'category'] // Include relations
        },
        {
          uid: 'api::comment.comment',
          actions: ['create', 'delete']
        }
      ],
      
      // Socket.IO server configuration
      socket: {
        serverOptions: {
          cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
          },
          pingTimeout: 60000,
          pingInterval: 25000
        }
      },
      
      // Custom event handlers
      events: [
        {
          name: 'connection',
          handler: ({ strapi, io }, socket) => {
            strapi.log.info(`Client connected: ${socket.id}`);
          }
        },
        {
          name: 'disconnect',
          handler: ({ strapi, io }, socket) => {
            strapi.log.info(`Client disconnected: ${socket.id}`);
          }
        }
      ],
      
      // Initialization hook
      hooks: {
        init: ({ strapi, $io }) => {
          strapi.log.info('[Socket.IO] Server initialized');
        }
      }
    }
  }
};
```

### Environment Variables

Recommended environment-based configuration:

```javascript
// config/plugins.js
module.exports = ({ env }) => ({
  io: {
    enabled: env.bool('SOCKET_IO_ENABLED', true),
    config: {
      contentTypes: env.json('SOCKET_IO_CONTENT_TYPES', []),
      socket: {
        serverOptions: {
          cors: {
            origin: env('CLIENT_URL', 'http://localhost:3000')
          }
        }
      }
    }
  }
});
```

```env
# .env
SOCKET_IO_ENABLED=true
CLIENT_URL=https://your-app.com
SOCKET_IO_CONTENT_TYPES=["api::article.article","api::comment.comment"]
```

---

## Usage Examples

### Server-Side Usage

Access the Socket.IO instance anywhere in your Strapi application:

```javascript
// In a controller, service, or lifecycle
const io = strapi.$io;

// Emit to all connected clients
strapi.$io.raw({
  event: 'notification',
  data: {
    message: 'Server maintenance in 5 minutes',
    type: 'warning'
  }
});

// Send private message to a specific socket
strapi.$io.sendPrivateMessage(socketId, 'order:updated', {
  orderId: 123,
  status: 'shipped'
});

// Emit to all clients in a room
strapi.$io.server.to('admin-room').emit('dashboard:update', {
  activeUsers: 42,
  revenue: 15000
});

// Emit to a specific namespace
strapi.$io.emitToNamespace('admin', 'alert', {
  message: 'New user registered'
});
```

### Client-Side Usage

#### Basic Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

// Listen for content type events
socket.on('article:create', (data) => {
  console.log('New article:', data);
});

socket.on('article:update', (data) => {
  console.log('Article updated:', data);
});

socket.on('article:delete', (data) => {
  console.log('Article deleted:', data.documentId);
});
```

#### With React

```jsx
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

function ArticlesList() {
  const [articles, setArticles] = useState([]);
  
  useEffect(() => {
    const socket = io('http://localhost:1337');
    
    // Listen for new articles
    socket.on('article:create', (article) => {
      setArticles(prev => [article, ...prev]);
    });
    
    // Listen for updates
    socket.on('article:update', (article) => {
      setArticles(prev => 
        prev.map(a => a.documentId === article.documentId ? article : a)
      );
    });
    
    // Listen for deletions
    socket.on('article:delete', (data) => {
      setArticles(prev => 
        prev.filter(a => a.documentId !== data.documentId)
      );
    });
    
    return () => socket.disconnect();
  }, []);
  
  return (
    <div>
      {articles.map(article => (
        <div key={article.documentId}>{article.title}</div>
      ))}
    </div>
  );
}
```

#### With Vue 3

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

const articles = ref([]);
let socket;

onMounted(() => {
  socket = io('http://localhost:1337');
  
  socket.on('article:create', (article) => {
    articles.value = [article, ...articles.value];
  });
  
  socket.on('article:update', (article) => {
    const index = articles.value.findIndex(a => a.documentId === article.documentId);
    if (index !== -1) {
      articles.value[index] = article;
    }
  });
  
  socket.on('article:delete', (data) => {
    articles.value = articles.value.filter(a => a.documentId !== data.documentId);
  });
});

onUnmounted(() => {
  socket?.disconnect();
});
</script>

<template>
  <div v-for="article in articles" :key="article.documentId">
    {{ article.title }}
  </div>
</template>
```

### Entity-Specific Subscriptions

Subscribe to updates for specific entities only:

```javascript
// Client-side: Subscribe to a specific article
socket.emit('subscribe-entity', {
  uid: 'api::article.article',
  id: 123
}, (response) => {
  if (response.success) {
    console.log('Subscribed to article 123');
  }
});

// Now you only receive updates for article 123
socket.on('article:update', (data) => {
  console.log('Article 123 was updated:', data);
});

// Unsubscribe when done
socket.emit('unsubscribe-entity', {
  uid: 'api::article.article',
  id: 123
});
```

**Benefits:**
- Reduced bandwidth - only receive relevant updates
- Better performance - less client-side processing
- Built-in permission checks - respects user roles

### Room Management

Organize connections into rooms:

```javascript
// Server-side: Add socket to a room
strapi.$io.joinRoom(socketId, 'premium-users');

// Get all sockets in a room
const sockets = await strapi.$io.getSocketsInRoom('premium-users');
console.log(`${sockets.length} premium users online`);

// Broadcast to a specific room
strapi.$io.server.to('premium-users').emit('exclusive-offer', {
  discount: 20,
  expiresIn: '24h'
});

// Remove socket from a room
strapi.$io.leaveRoom(socketId, 'premium-users');

// Disconnect a specific socket
strapi.$io.disconnectSocket(socketId, 'Kicked by admin');
```

---

## Authentication

The plugin supports multiple authentication strategies.

### Public Access (No Authentication)

```javascript
const socket = io('http://localhost:1337');
// No auth - placed in 'Public' role room
```

### JWT Authentication (Users & Permissions)

```javascript
// 1. Get JWT token from login
const response = await fetch('http://localhost:1337/api/auth/local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: 'user@example.com',
    password: 'password123'
  })
});

const { jwt } = await response.json();

// 2. Connect with JWT
const socket = io('http://localhost:1337', {
  auth: {
    strategy: 'jwt',
    token: jwt
  }
});

// User is placed in their role room (e.g., 'Authenticated')
```

### API Token Authentication

```javascript
// 1. Create API token in Strapi Admin:
//    Settings → Global Settings → API Tokens → Create new token

// 2. Connect with API token
const socket = io('http://localhost:1337', {
  auth: {
    strategy: 'api-token',
    token: 'your-api-token-here'
  }
});
```

### Permission Enforcement

Events are automatically filtered based on the user's role:

```javascript
// Authenticated user with 'Editor' role
socket.on('article:create', (data) => {
  // Only receives events for content types they have permission to access
});
```

Configure permissions in the Strapi admin panel:
1. Go to **Settings → Users & Permissions → Roles**
2. Select a role (e.g., "Authenticated")
3. Configure Socket.IO permissions per content type

---

## Admin Panel

### Dashboard Widget

After installation, a live statistics widget appears on your Strapi admin homepage:

**Widget Shows:**
- Live connection status (pulsing indicator when active)
- Active connections count
- Active rooms count
- Events per second
- Total events processed since startup

Updates automatically every 5 seconds.

### Settings Panel

Navigate to **Settings → Socket.IO** for visual configuration:

#### General Settings
- Enable/disable the plugin
- Configure CORS origins
- Set server options (ping timeout, etc.)

#### Content Types
- Enable automatic events for content types
- Select specific actions (create, update, delete)
- Include relations in events
- Custom event names

#### Security
- Require authentication
- Rate limiting configuration
- IP whitelisting
- Input validation rules

#### Monitoring
- View active connections with user details
- See event logs in real-time
- Monitor performance metrics
- Export connection data

#### Advanced
- Configure namespaces
- Set up Redis adapter for scaling
- Custom event handlers
- Lifecycle hooks

---

## TypeScript Support

Full TypeScript definitions are included for excellent IDE support.

### Import Types

```typescript
import type { 
  SocketIO, 
  SocketIOConfig,
  EmitOptions,
  RawEmitOptions 
} from '@strapi-community/plugin-io/types';
```

### Configuration Example

```typescript
// config/plugins.ts
import type { SocketIOConfig } from '@strapi-community/plugin-io/types';

export default {
  io: {
    enabled: true,
    config: {
      contentTypes: [
        {
          uid: 'api::article.article',
          actions: ['create', 'update', 'delete'],
          populate: ['author', 'category']
        }
      ],
      socket: {
        serverOptions: {
          cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST']
          }
        }
      }
    } satisfies SocketIOConfig
  }
};
```

### Usage Example

```typescript
// In your Strapi code
import type { SocketIO } from '@strapi-community/plugin-io/types';

// Type-safe access
const io: SocketIO = strapi.$io;

// All methods have full IntelliSense
await io.emit({
  event: 'notification',
  schema: 'api::article.article',
  data: { title: 'New Article' }
});
```

---

## Performance

The plugin is optimized for production environments.

### Benchmarks

- **Concurrent Connections**: 2500+ simultaneous connections
- **Memory Usage**: ~17KB per connection
- **Event Throughput**: 10,000+ events/second
- **Latency**: <10ms for local broadcasts

### Optimizations

#### Intelligent Caching
Role and permission data is cached for 5 minutes, reducing database queries by up to 90%.

#### Debouncing
Bulk operations are automatically debounced to prevent event flooding during data imports.

#### Parallel Processing
All event emissions are processed in parallel for maximum throughput.

#### Connection Pooling
Efficient connection management with automatic cleanup of stale connections.

### Production Configuration

```javascript
// config/plugins.js (production)
module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      contentTypes: env.json('SOCKET_IO_CONTENT_TYPES'),
      
      socket: {
        serverOptions: {
          cors: {
            origin: env('CLIENT_URL'),
            credentials: true
          },
          // Optimize for production
          pingTimeout: 60000,
          pingInterval: 25000,
          maxHttpBufferSize: 1e6,
          transports: ['websocket', 'polling']
        }
      },
      
      // Use Redis for horizontal scaling
      hooks: {
        init: async ({ strapi, $io }) => {
          const { createAdapter } = require('@socket.io/redis-adapter');
          const { createClient } = require('redis');
          
          const pubClient = createClient({ url: env('REDIS_URL') });
          const subClient = pubClient.duplicate();
          
          await Promise.all([pubClient.connect(), subClient.connect()]);
          
          $io.server.adapter(createAdapter(pubClient, subClient));
          
          strapi.log.info('[Socket.IO] Redis adapter connected');
        }
      }
    }
  }
});
```

For detailed performance tuning, see the [Optimizations Guide](./docs/optimizations.md).

---

## Migration Guide

### From v2 (Strapi v4) to v5 (Strapi v5)

**Good news:** The API is 100% compatible! Most projects migrate in under 1 hour.

#### Quick Migration Steps

1. **Update Strapi to v5**
   ```bash
   npm install @strapi/strapi@5 @strapi/plugin-users-permissions@5
   ```

2. **Update the plugin**
   ```bash
   npm uninstall strapi-plugin-io
   npm install @strapi-community/plugin-io@latest
   ```

3. **Test your application**
   ```bash
   npm run develop
   ```

Your configuration stays the same - no code changes needed!

#### What Changed

- **Package name**: `strapi-plugin-io` → `@strapi-community/plugin-io`
- **Package structure**: Uses new Strapi v5 Plugin SDK
- **Dependencies**: Updated to Strapi v5 peer dependencies
- **Build process**: Optimized build with modern tooling

#### What Stayed the Same

- All API methods work identically
- Configuration format unchanged
- Client-side code works as-is
- Same helper functions
- Same event format

For detailed migration instructions, see [docs/guide/migration.md](./docs/guide/migration.md).

---

## Documentation

### Official Documentation

- **[Online Documentation](https://strapi-plugin-io.netlify.app/)** - Complete interactive docs
- **[API Reference](./docs/api/io-class.md)** - All methods and properties
- **[Configuration Guide](./docs/api/plugin-config.md)** - Detailed configuration options
- **[Usage Examples](./docs/examples/)** - Real-world use cases
- **[Migration Guide](./docs/guide/migration.md)** - Upgrade from v4 to v5

### Guides

- **[Getting Started](./docs/guide/getting-started.md)** - Step-by-step setup
- **[Authentication](./docs/guide/authentication.md)** - JWT and API token setup
- **[Security Best Practices](./docs/guide/security.md)** - Production security
- **[Performance Tuning](./docs/optimizations.md)** - Scale your application

### Examples

- **[Content Types](./docs/examples/content-types.md)** - Automatic CRUD events
- **[Custom Events](./docs/examples/events.md)** - Server-client communication
- **[Hooks & Adapters](./docs/examples/hooks.md)** - Redis, MongoDB integration
- **[Real-World Use Cases](./docs/examples/)** - Chat, notifications, live editing

---

## Related Plugins

Build complete real-time applications with these complementary Strapi v5 plugins:

### [Magic-Mail](https://github.com/Schero94/Magic-Mail)
Enterprise email management with OAuth 2.0 support. Perfect for sending transactional emails triggered by Socket.IO events.

**Use case:** Send email notifications when real-time events occur.

### [Magic-Sessionmanager](https://github.com/Schero94/Magic-Sessionmanager)
Advanced session tracking and monitoring. Track Socket.IO connections, monitor active users, and analyze session patterns.

**Use case:** Monitor who's connected to your WebSocket server in real-time.

### [Magicmark](https://github.com/Schero94/Magicmark)
Bookmark management system with real-time sync. Share bookmarks instantly with your team using Socket.IO integration.

**Use case:** Collaborative bookmark management with live updates.

---

## Contributing

We welcome contributions! Here's how you can help:

### Report Bugs

Found a bug? [Open an issue](https://github.com/strapi-community/strapi-plugin-io/issues) with:
- Strapi version
- Plugin version
- Steps to reproduce
- Expected vs actual behavior

### Suggest Features

Have an idea? [Start a discussion](https://github.com/strapi-community/strapi-plugin-io/discussions) to:
- Describe the feature
- Explain the use case
- Discuss implementation

### Submit Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Clone the repository
git clone https://github.com/strapi-community/strapi-plugin-io.git
cd strapi-plugin-io

# Install dependencies
npm install

# Build the plugin
npm run build

# Run in watch mode
npm run watch

# Verify structure
npm run verify
```

---

## Support

- **Documentation**: https://strapi-plugin-io.netlify.app/
- **GitHub Issues**: https://github.com/strapi-community/strapi-plugin-io/issues
- **GitHub Discussions**: https://github.com/strapi-community/strapi-plugin-io/discussions
- **Strapi Discord**: https://discord.strapi.io

---

## License

[MIT License](./LICENSE)

Copyright (c) 2024 Strapi Community

---

## Credits

**Original Authors:**
- [@ComfortablyCoding](https://github.com/ComfortablyCoding)
- [@hrdunn](https://github.com/hrdunn)

**Enhanced and Maintained by:**
- [@Schero94](https://github.com/Schero94)

**Maintained until:** December 2026

---

## Changelog

### v5.0.0 (Latest)
- Strapi v5 support
- Package renamed to `@strapi-community/plugin-io`
- Enhanced TypeScript support
- Performance optimizations
- Updated documentation

For full changelog, see [CHANGELOG.md](./CHANGELOG.md).

---

<div align="center">
  
**[Documentation](https://strapi-plugin-io.netlify.app/)** • 
**[API Reference](./docs/api/io-class.md)** • 
**[Examples](./docs/examples/)** • 
**[GitHub](https://github.com/strapi-community/strapi-plugin-io)**

Made with ❤️ for the Strapi community

</div>
