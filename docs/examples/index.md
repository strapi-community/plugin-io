# Examples

Real-world use cases and implementation patterns for Socket.IO Plugin.

---

## 📚 Available Examples

### Content Types
Learn how to monitor content types and emit real-time events automatically.

**[View Content Types Examples →](./content-types)**

### Events  
Custom event handlers and client-server communication patterns.

**[View Events Examples →](./events)**

### Hooks
Use lifecycle hooks for initialization, adapters, and middleware.

**[View Hooks Examples →](./hooks)**

---

## Quick Examples

### Real-Time Blog

Notify readers instantly when new articles are published:

```javascript
// config/plugins.js
module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article']
    }
  }
};
```

```javascript
// Frontend
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337');

socket.on('article:create', (article) => {
  // Add new article to the list
  addArticleToList(article);
  showNotification('New article published!');
});
```

### Live Chat

Build a chat system with rooms and private messages:

```javascript
// Server: config/plugins.js
events: [
  {
    name: 'chat:send',
    async handler({ strapi, io }, socket, message) {
      // Save message
      const saved = await strapi.entityService.create(
        'api::message.message',
        { data: message }
      );
      
      // Broadcast to room
      io.server.to(message.room).emit('chat:message', saved);
    }
  },
  {
    name: 'room:join',
    handler({ strapi, io }, socket, roomId) {
      socket.join(roomId);
      socket.to(roomId).emit('user:joined', {
        userId: socket.data.userId
      });
    }
  }
]
```

```javascript
// Frontend
const socket = io('http://localhost:1337', {
  auth: { strategy: 'jwt', token: userToken }
});

// Join room
socket.emit('room:join', 'general');

// Send message
socket.emit('chat:send', {
  room: 'general',
  text: 'Hello everyone!'
});

// Receive messages
socket.on('chat:message', (message) => {
  displayMessage(message);
});
```

### E-Commerce Notifications

Update product availability and prices in real-time:

```javascript
// Backend: After inventory update
async updateProduct(id, data) {
  const product = await strapi.entityService.update(
    'api::product.product',
    id,
    { data, populate: ['images', 'category'] }
  );
  
  // Notify all watching users
  await strapi.$io.emit({
    event: 'update',
    schema: 'api::product.product',
    data: product
  });
  
  // If out of stock, send special alert
  if (product.stock === 0) {
    strapi.$io.raw({
      event: 'product:out-of-stock',
      data: { id: product.id, name: product.name }
    });
  }
  
  return product;
}
```

```javascript
// Frontend: Product page
socket.on('product:update', (product) => {
  if (product.id === currentProductId) {
    updatePrice(product.price);
    updateStock(product.stock);
  }
});

socket.on('product:out-of-stock', ({ id }) => {
  if (id === currentProductId) {
    showOutOfStockBanner();
  }
});
```

### Collaborative Editing

Sync changes across multiple users editing the same document:

```javascript
// Server
events: [
  {
    name: 'document:edit',
    handler({ strapi, io }, socket, { docId, changes }) {
      // Broadcast to others editing same document
      socket.to(`document:${docId}`).emit('document:changes', {
        userId: socket.data.userId,
        changes
      });
    }
  },
  {
    name: 'document:open',
    handler({ strapi, io }, socket, docId) {
      socket.join(`document:${docId}`);
    }
  }
]
```

```javascript
// Frontend
// Join document room
socket.emit('document:open', documentId);

// Send changes
editor.on('change', (changes) => {
  socket.emit('document:edit', {
    docId: documentId,
    changes
  });
});

// Apply remote changes
socket.on('document:changes', ({ userId, changes }) => {
  if (userId !== currentUserId) {
    editor.applyChanges(changes);
  }
});
```

### Admin Dashboard Monitoring

Push live metrics to admin dashboards:

```javascript
// Server: Update stats every 5 seconds
hooks: {
  init({ strapi, io }) {
    setInterval(async () => {
      const stats = {
        users: await strapi.db.query('plugin::users-permissions.user').count(),
        orders: await strapi.db.query('api::order.order').count({ 
          where: { status: 'pending' } 
        }),
        revenue: await calculateRevenue()
      };
      
      // Send to admin namespace
      io.namespaces.admin?.emit('dashboard:stats', stats);
    }, 5000);
  }
}
```

```javascript
// Frontend: Admin Dashboard
const socket = io('http://localhost:1337/admin', {
  auth: { strategy: 'api-token', token: adminToken }
});

socket.on('dashboard:stats', (stats) => {
  updateUserCount(stats.users);
  updateOrderCount(stats.orders);
  updateRevenue(stats.revenue);
});
```

### Typing Indicators

Show when users are typing in a chat or comment section:

```javascript
// Server
events: [
  {
    name: 'typing:start',
    handler({ io }, socket, { room }) {
      socket.to(room).emit('user:typing', {
        userId: socket.data.userId,
        room
      });
    }
  },
  {
    name: 'typing:stop',
    handler({ io }, socket, { room }) {
      socket.to(room).emit('user:stopped-typing', {
        userId: socket.data.userId,
        room
      });
    }
  }
]
```

```javascript
// Frontend
let typingTimeout;

messageInput.addEventListener('input', () => {
  // Emit typing start
  socket.emit('typing:start', { room: currentRoom });
  
  // Clear previous timeout
  clearTimeout(typingTimeout);
  
  // Set timeout to stop typing
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { room: currentRoom });
  }, 1000);
});

socket.on('user:typing', ({ userId }) => {
  showTypingIndicator(userId);
});

socket.on('user:stopped-typing', ({ userId }) => {
  hideTypingIndicator(userId);
});
```

### Online Presence

Track and display online users:

```javascript
// Server
events: [
  {
    name: 'connection',
    async handler({ strapi, io }, socket) {
      if (socket.data.userId) {
        // Mark user as online
        await strapi.entityService.update(
          'plugin::users-permissions.user',
          socket.data.userId,
          { data: { isOnline: true } }
        );
        
        // Notify others
        socket.broadcast.emit('user:online', {
          userId: socket.data.userId
        });
      }
    }
  },
  {
    name: 'disconnect',
    async handler({ strapi }, socket) {
      if (socket.data.userId) {
        // Mark user as offline
        await strapi.entityService.update(
          'plugin::users-permissions.user',
          socket.data.userId,
          { data: { 
            isOnline: false,
            lastSeen: new Date()
          }}
        );
        
        // Notify others
        socket.broadcast.emit('user:offline', {
          userId: socket.data.userId
        });
      }
    }
  }
]
```

```javascript
// Frontend
socket.on('user:online', ({ userId }) => {
  updateUserStatus(userId, 'online');
});

socket.on('user:offline', ({ userId }) => {
  updateUserStatus(userId, 'offline');
});
```

---

## Framework Examples

### React

```typescript
// hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(url: string, token?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketIo = io(url, {
      auth: token ? {
        strategy: 'jwt',
        token
      } : undefined
    });

    socketIo.on('connect', () => setConnected(true));
    socketIo.on('disconnect', () => setConnected(false));

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [url, token]);

  return { socket, connected };
}

// Component usage
function ArticleList() {
  const { socket, connected } = useSocket('http://localhost:1337', userToken);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('article:create', (article) => {
      setArticles(prev => [article, ...prev]);
    });

    return () => {
      socket.off('article:create');
    };
  }, [socket]);

  return <div>{/* ... */}</div>;
}
```

### Vue 3

```typescript
// composables/useSocket.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';

export function useSocket(url: string, token?: string) {
  const socket = ref<Socket | null>(null);
  const connected = ref(false);

  onMounted(() => {
    socket.value = io(url, {
      auth: token ? {
        strategy: 'jwt',
        token
      } : undefined
    });

    socket.value.on('connect', () => {
      connected.value = true;
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
    });
  });

  onUnmounted(() => {
    socket.value?.disconnect();
  });

  return { socket, connected };
}

// Component usage
<script setup>
import { useSocket } from '@/composables/useSocket';
import { ref, watch } from 'vue';

const articles = ref([]);
const { socket, connected } = useSocket('http://localhost:1337');

watch(socket, (newSocket) => {
  if (!newSocket) return;
  
  newSocket.on('article:create', (article) => {
    articles.value = [article, ...articles.value];
  });
});
</script>
```

### Next.js

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337');
  }
  return socket;
};

// app/articles/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

export default function ArticlesPage() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('article:create', (article) => {
      setArticles(prev => [article, ...prev]);
    });

    return () => {
      socket.off('article:create');
    };
  }, []);

  return <div>{/* ... */}</div>;
}
```

---

## Testing Examples

### Jest

```javascript
// socket.test.js
const io = require('socket.io-client');

describe('Socket.IO Connection', () => {
  let socket;

  beforeAll((done) => {
    socket = io('http://localhost:1337');
    socket.on('connect', done);
  });

  afterAll(() => {
    socket.disconnect();
  });

  test('should receive article:create event', (done) => {
    socket.on('article:create', (data) => {
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('title');
      done();
    });

    // Trigger creation in Strapi
    // ...
  });

  test('should emit custom event', (done) => {
    socket.emit('ping', { timestamp: Date.now() });
    
    socket.on('pong', (data) => {
      expect(data).toHaveProperty('timestamp');
      done();
    });
  });
});
```

---

## More Examples

Explore detailed examples for specific use cases:

- **[Content Types Examples](./content-types)** - Monitoring content types
- **[Events Examples](./events)** - Custom event handlers
- **[Hooks Examples](./hooks)** - Lifecycle hooks and adapters

---

## Need Help?

- **[API Reference](/api/io-class)** - Complete API documentation
- **[Configuration](/api/plugin-config)** - All configuration options
- **[GitHub Discussions](https://github.com/ComfortablyCoding/strapi-plugin-io/discussions)** - Ask questions
