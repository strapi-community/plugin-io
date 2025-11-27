# @strapi-community/plugin-io

A plugin for [Strapi CMS](https://github.com/strapi/strapi) that provides the ability for [Socket IO](https://socket.io) integration

[![Downloads](https://img.shields.io/npm/dm/strapi-plugin-io?style=for-the-badge)](https://img.shields.io/npm/dm/strapi-plugin-io?style=for-the-badge)
[![Install size](https://img.shields.io/npm/l/strapi-plugin-io?style=for-the-badge)](https://img.shields.io/npm/l/strapi-plugin-io?style=for-the-badge)
[![Package version](https://img.shields.io/github/v/release/ComfortablyCoding/strapi-plugin-io?style=for-the-badge)](https://img.shields.io/github/v/release/ComfortablyCoding/strapi-plugin-io?style=for-the-badge)

## Requirements

The installation requirements are the same as Strapi itself and can be found in the documentation on the [Quick Start](https://strapi.io/documentation/developer-docs/latest/getting-started/quick-start.html) page in the Prerequisites info card.

### Supported Strapi versions

- **v5.x.x** (Current version)
- v4.x.x (Legacy - see older versions)

**NOTE**: This version (v3.x.x+) is for Strapi v5. For Strapi v4, please use version 2.x.x of this plugin.

## Installation

```sh
npm install strapi-plugin-io

# or

yarn add strapi-plugin-io
```

## Configuration

### Basic Setup

Configure the plugin in your Strapi config file: `config/plugins.js` (or `config/plugins.ts` for TypeScript):

```javascript
module.exports = {
  'io': {
    enabled: true,
    config: {
      // Socket IO server options
      socket: {
        serverOptions: {
          cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST']
          }
        }
      },
      // Content types to watch for real-time events
      contentTypes: [
        'api::article.article',
        'api::comment.comment',
        // or with specific actions:
        {
          uid: 'api::product.product',
          actions: ['create', 'update', 'delete']
        }
      ],
      // Custom events
      events: [
        {
          name: 'connection',
          handler: ({ strapi, io }, socket) => {
            console.log('Socket connected:', socket.id);
          }
        }
      ],
      // Hooks
      hooks: {
        init: ({ strapi, $io }) => {
          console.log('Socket IO initialized');
        }
      }
    }
  }
};
```

### Authentication

The plugin supports two authentication strategies:

1. **JWT (Users-Permissions)**: Use JWT tokens from the users-permissions plugin
2. **API Token**: Use Strapi API tokens

#### Client-side connection example:

```javascript
import { io } from 'socket.io-client';

// Using JWT (users-permissions)
const socket = io('http://localhost:1337', {
  auth: {
    strategy: 'jwt',
    token: 'your-jwt-token'
  }
});

// Using API Token
const socket = io('http://localhost:1337', {
  auth: {
    strategy: 'api-token',
    token: 'your-api-token'
  }
});

// Listen for content type events
socket.on('article:create', (data) => {
  console.log('New article created:', data);
});

socket.on('article:update', (data) => {
  console.log('Article updated:', data);
});

socket.on('article:delete', (data) => {
  console.log('Article deleted:', data);
});
```

## Usage

### Quick Start

```javascript
// Access Socket.IO instance anywhere in your Strapi app
const io = strapi.$io;

// Emit custom events to all clients
strapi.$io.raw({
  event: 'notification',
  data: { message: 'Hello World!' }
});

// Send private message to specific socket
strapi.$io.sendPrivateMessage(socketId, 'notification', {
  type: 'info',
  message: 'Payment processed'
});

// Emit to specific namespace
strapi.$io.emitToNamespace('admin', 'dashboard:update', {
  stats: { users: 1234, active: 56 }
});

// Get real-time stats
const monitoringService = strapi.plugin('io').service('monitoring');
const stats = monitoringService.getConnectionStats();
console.log(`Connected: ${stats.connected} clients`);
```

### Room Management

```javascript
// Join socket to room
strapi.$io.joinRoom(socketId, 'premium-users');

// Get all sockets in room
const sockets = await strapi.$io.getSocketsInRoom('admin-panel');
console.log(`${sockets.length} admins online`);

// Broadcast to room
strapi.$io.server.to('premium-users').emit('exclusive-offer', data);
```

### Admin Panel Configuration

**Dashboard Widget:**
- View real-time Socket.IO statistics directly on the Strapi admin dashboard
- Monitor active connections, rooms, and events per second
- Quick access to detailed monitoring page

**Navigate to:** Settings → Socket.IO

**Configure:**
- ✅ **CORS Origins** - Allow your frontend domains
- ✅ **Role Permissions** - Control who can connect and access content types
- ✅ **Security Settings** - Enable authentication, rate limiting
- ✅ **Event Configuration** - Customize event names, include relations
- ✅ **Redis Adapter** - Scale across multiple servers
- ✅ **Namespaces** - Separate channels (e.g., `/admin`, `/chat`)
- ✅ **Monitoring** - View live connections and event logs

### Content Type Events (Automatic)

Enable content types in admin panel, then listen on frontend:

```javascript
socket.on('article:create', (article) => {
  console.log('New article:', article);
});

socket.on('article:update', (article) => {
  console.log('Updated article:', article);
});

socket.on('article:delete', (article) => {
  console.log('Deleted article ID:', article.id);
});
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import type { SocketIO, SocketIOConfig } from 'strapi-plugin-io/types';

const config: SocketIOConfig = {
  contentTypes: ['api::article.article'],
  socket: {
    serverOptions: {
      cors: { origin: '*' }
    }
  }
};
```

## Dashboard Widget

The plugin includes a **live statistics widget** on your Strapi admin home page:

📊 **Widget Features:**
- 🟢 Live connection status with pulsing indicator
- 👥 Active connections count
- 💬 Active rooms count
- ⚡ Events per second
- 📈 Total events processed
- 🔄 Auto-updates every 5 seconds

**See it in action:** Navigate to your admin home page after installing the plugin!

For details, see **[WIDGET.md](./WIDGET.md)**

---

## Documentation

📚 **Complete Documentation:**
- **[API Reference](./API.md)** - Complete API documentation with TypeScript definitions
- **[Usage Guide](./USAGE-GUIDE.md)** - Practical examples & real-world use cases
- **[Widget Guide](./WIDGET.md)** - Dashboard widget documentation
- **[Security Guide](./SECURITY.md)** - Security best practices & implementation
- **[Features](./FEATURES.md)** - Full feature list with examples
- **[Optimizations](./OPTIMIZATIONS.md)** - Performance tuning & benchmarks

## Features

- ✅ **Real-Time Events** - Automatic content type CRUD event broadcasting
- ✅ **Authentication** - JWT and API Token support with role-based access
- ✅ **Admin Panel** - Visual configuration for all settings
- ✅ **Room Management** - Advanced room/channel system
- ✅ **Namespaces** - Separate communication channels (e.g., `/admin`, `/chat`)
- ✅ **Monitoring** - Live connection stats and event logs
- ✅ **Redis Adapter** - Scale across multiple servers
- ✅ **Rate Limiting** - Prevent abuse with configurable limits
- ✅ **Security** - IP whitelisting, authentication requirements, input validation
- ✅ **TypeScript** - Full type definitions for IntelliSense
- ✅ **Helper Functions** - 7 utility functions for common tasks
- ✅ **Performance** - Optimized for production use
- ✅ **Vibecode Ready** - IDE-friendly with comprehensive documentation

## Performance

The plugin is optimized for production use:

- **Intelligent Caching**: Roles and permissions are cached for 5 minutes, reducing DB queries by up to 90%
- **Debouncing**: Bulk operations are debounced to prevent event flooding
- **Parallel Processing**: All emissions are processed in parallel for maximum throughput
- **Connection Pooling**: Supports 2500+ concurrent connections with optimized memory usage (~17KB per connection)

See [OPTIMIZATIONS.md](./OPTIMIZATIONS.md) for detailed performance benchmarks and best practices.

## Migration from v2 (Strapi v4) to v3 (Strapi v5)

**Good News:** The API remains 100% compatible! 🎉

**Most projects migrate in under 1 hour.**

### Quick Migration Steps

1. Update Strapi to v5: `npm install @strapi/strapi@5`
2. Update plugin: `npm install strapi-plugin-io@latest`
3. Test your application - configuration stays the same!

### Main Changes
- ✅ **Package structure**: Uses new Strapi v5 Plugin SDK
- ✅ **Dependencies**: Updated to Strapi v5 peer dependencies  
- ✅ **Build process**: Optimized build with `npm run build`
- ✅ **Configuration**: Same as v2, no changes needed!
- ✅ **API**: All methods work identically

**📖 Complete Migration Guide:** See [docs/guide/migration.md](./docs/guide/migration.md) or visit https://strapi-plugin-io.netlify.app/guide/migration

## Development

```sh
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes
npm run watch

# Verify plugin structure
npm run verify
```

## Documentation

For more detailed documentation, visit: https://strapi-plugin-io.netlify.app/

## Bugs

If any bugs are found please report them as a [Github Issue](https://github.com/ComfortablyCoding/strapi-plugin-io/issues)

## Related Plugins

Check out other useful Strapi v5 plugins by [@Schero94](https://github.com/Schero94):

### 📧 [Magic-Mail](https://github.com/Schero94/Magic-Mail)
Enterprise email management with OAuth 2.0 - Perfect for sending notifications via Socket.IO events

### 🔐 [Magic-Sessionmanager](https://github.com/Schero94/Magic-Sessionmanager)
Advanced session tracking - Monitor Socket.IO connections and user activity

### 🔖 [Magicmark](https://github.com/Schero94/Magicmark)
Bookmark management - Share bookmarks in real-time with Socket.IO

## License

MIT

## Credits

Maintained by [@ComfortablyCoding](https://github.com/ComfortablyCoding) and [@hrdunn](https://github.com/hrdunn)

Updated and enhanced by [@Schero94](https://github.com/Schero94)
