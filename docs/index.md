---
layout: home

hero:
  name: 'Strapi Plugin IO'
  text: 'Socket.IO Integration for Strapi v5'
  tagline: 'Real-time WebSocket connections with authentication, monitoring, and advanced features'
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View Examples
      link: /examples/
    - theme: alt
      text: API Reference
      link: /api/io-class

features:
  - icon: ⚡
    title: Real-Time Events
    details: Automatic CRUD event broadcasting for all content types with role-based permissions
  
  - icon: 🔐
    title: Built-in Authentication
    details: JWT and API Token authentication with automatic role-based access control
  
  - icon: 📊
    title: Admin Dashboard
    details: Visual configuration panel with live monitoring, connection stats, and event logs
  
  - icon: 🚀
    title: Production Ready
    details: Redis adapter support, rate limiting, IP whitelisting, and optimized for 2500+ concurrent connections
  
  - icon: 🎯
    title: Developer Friendly
    details: Full TypeScript support, 7 helper functions, comprehensive documentation
  
  - icon: 🔧
    title: Highly Configurable
    details: Namespaces, rooms, custom events, hooks, and flexible CORS settings
---

## Quick Start

Install the plugin:

```bash
npm install strapi-plugin-io
```

Enable in `config/plugins.js`:

```javascript
module.exports = {
  'io': {
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

Connect from your frontend:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337', {
  auth: {
    strategy: 'jwt',
    token: 'your-jwt-token'
  }
});

socket.on('article:create', (data) => {
  console.log('New article:', data);
});
```

## What's New in v3.0

**Strapi v5 Support** - Built for the latest Strapi version with full compatibility

**Migration Made Easy** - [See migration guide](/guide/migration) - most projects migrate in under 1 hour!

**Admin Dashboard** - Visual configuration with live monitoring widget on home page

**Advanced Security** - Rate limiting, IP whitelisting, enhanced authentication

**Performance Optimizations** - 90% reduction in DB queries, improved caching, parallel processing

**Enhanced API** - 7 helper functions for common tasks, improved TypeScript definitions

**Better Documentation** - Comprehensive guides, real-world examples, migration path

## Core Features

### 🎯 Automatic Content Type Events

Enable any content type for real-time updates:

```javascript
// Backend: config/plugins.js
contentTypes: [
  'api::article.article',
  'api::comment.comment',
  {
    uid: 'api::product.product',
    actions: ['create', 'update']
  }
]
```

```javascript
// Frontend: Automatic events
socket.on('article:create', (article) => { /* ... */ });
socket.on('article:update', (article) => { /* ... */ });
socket.on('article:delete', (article) => { /* ... */ });
```

### 🔐 Role-Based Access Control

Permissions are automatically enforced based on user roles:

```javascript
// Public users only receive events they have permission to see
// Authenticated users receive events based on their role
// API tokens work with their configured permissions
```

### 📊 Real-Time Monitoring

View live statistics in your admin panel:
- 🟢 Active connections
- 💬 Active rooms
- ⚡ Events per second
- 📈 Total events processed

### 🚀 Helper Functions

Seven utility functions for common tasks:

```javascript
// Join/leave rooms
strapi.$io.joinRoom(socketId, 'premium-users');
strapi.$io.leaveRoom(socketId, 'premium-users');

// Private messages
strapi.$io.sendPrivateMessage(socketId, 'notification', data);

// Broadcast to all except sender
strapi.$io.broadcast(socketId, 'user-joined', data);

// Namespace management
strapi.$io.emitToNamespace('admin', 'dashboard:update', stats);

// Room info
const sockets = await strapi.$io.getSocketsInRoom('chat-room');

// Disconnect
strapi.$io.disconnectSocket(socketId, 'Kicked by admin');
```

## Use Cases

### Real-Time Blog
Automatically notify readers when new articles are published

### Live Chat
Build a chat system with rooms, private messages, and typing indicators

### E-Commerce
Update product availability, prices, and inventory in real-time

### Collaborative Tools
Synchronize state across multiple users editing the same document

### Dashboards
Push live metrics, alerts, and system status to admin panels

### Gaming
Handle player connections, game state, and multiplayer interactions

### IoT Integration
Receive and broadcast sensor data and device status updates

## Dashboard Widget

The plugin includes a **live statistics widget** on your Strapi admin home page:

![Socket.IO Dashboard Widget](/widget.png)

📊 **Widget Features:**
- 🟢 Live connection status with pulsing indicator
- 👥 Active connections count
- 💬 Active rooms count
- ⚡ Events per second
- 📈 Total events processed
- 🔄 Auto-updates every 5 seconds

**See it in action:** Navigate to your admin home page after installing the plugin!

---

## Visual Configuration

Configure everything visually in the admin panel:

![Socket.IO Settings](/settings.png)

**Settings → Socket.IO** gives you full control over:
- CORS origins
- Content type monitoring
- Role-based permissions
- Security settings
- Rate limiting

![Monitoring Dashboard](/monitoringSettings.png)

**Real-time monitoring** shows:
- Active connections with user details
- Event logs
- Performance metrics
- Connection history

---

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ iOS Safari 14+
- ✅ Android Chrome 90+

## Requirements

- Node.js 18.0.0 - 22.x
- Strapi v5.x
- Socket.IO 4.x

## Community & Support

- 📖 [Full Documentation](https://strapi-plugin-io.netlify.app/)
- 🐛 [Report Issues](https://github.com/ComfortablyCoding/strapi-plugin-io/issues)
- 💬 [Discussions](https://github.com/ComfortablyCoding/strapi-plugin-io/discussions)
- ⭐ [Star on GitHub](https://github.com/ComfortablyCoding/strapi-plugin-io)

## Next Steps

- **[View Examples](/examples/)** - Learn common use cases
- **[API Reference](/api/io-class)** - Explore all available methods
- **[Configuration](/api/plugin-config)** - Advanced setup options
- **[Dashboard Widget](/guide/widget)** - Learn about the monitoring widget
- **[Migration Guide](/guide/migration)** - Upgrade from Strapi v4

---

## Related Plugins

Check out other powerful Strapi v5 plugins by [@Schero94](https://github.com/Schero94) that complement Socket.IO perfectly:

### 📧 Magic-Mail
Enterprise-grade multi-account email management with OAuth 2.0 support. Perfect for sending transactional emails triggered by real-time events.

**Features**: Gmail/Microsoft/Yahoo OAuth, SendGrid, Mailgun, smart routing, rate limiting

🔗 **[View on GitHub](https://github.com/Schero94/Magic-Mail)** | 📦 **[NPM Package](https://www.npmjs.com/package/strapi-plugin-magic-mail-v5)**

---

### 🔐 Magic-Sessionmanager
Advanced session tracking and monitoring for Strapi v5. Track Socket.IO connections, monitor active users, and analyze session patterns.

**Features**: Real-time tracking, IP monitoring, active user dashboard, session analytics

🔗 **[View on GitHub](https://github.com/Schero94/Magic-Sessionmanager)**

---

### 🔖 Magicmark
Powerful bookmark management system with real-time sync capabilities. Share bookmarks instantly with your team using Socket.IO integration.

**Features**: Tag organization, team sharing, real-time sync, full REST API

🔗 **[View on GitHub](https://github.com/Schero94/Magicmark)**

---

## License

MIT License - see [LICENSE](https://github.com/ComfortablyCoding/strapi-plugin-io/blob/master/LICENSE) for details

---

Made with ❤️ by [@ComfortablyCoding](https://github.com/ComfortablyCoding) and [@hrdunn](https://github.com/hrdunn)

Updated and made it better by: [@Schero94](https://github.com/Schero94)

**Will be maintained till December 2026** 🚀
