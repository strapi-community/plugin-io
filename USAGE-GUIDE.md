# Socket.IO Plugin - Usage Guide

**Practical Examples & Real-World Scenarios**

---

## Quick Start

### 1. Basic Setup (5 minutes)

```bash
npm install strapi-plugin-io
```

Configure in `config/plugins.js`:

```javascript
module.exports = {
  'io': {
    enabled: true,
    config: {
      // Optional: Custom server options
      socket: {
        serverOptions: {
          cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000'
          }
        }
      }
    }
  }
};
```

Start Strapi:
```bash
npm run develop
```

### 2. Connect from Frontend

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337');

socket.on('connect', () => {
  console.log('✅ Connected to Strapi!');
});

// Listen for article updates
socket.on('article:create', (data) => {
  console.log('New article:', data);
});
```

**That's it!** You're now receiving real-time updates.

---

## Use Case 1: Real-Time Blog

### Backend: Enable Content Type Monitoring

1. Go to **Admin Panel** → **Settings** → **Socket.IO**
2. Under **Role Permissions** → **Public**, enable:
   - `api::article.article` → ✅ Create, ✅ Update, ✅ Delete
3. Click **Save**

### Frontend: Display Live Articles

```typescript
// components/ArticleList.tsx
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

export default function ArticleList() {
  const [articles, setArticles] = useState([]);
  
  useEffect(() => {
    const socket = io('http://localhost:1337');
    
    // Initial fetch
    fetch('http://localhost:1337/api/articles')
      .then(res => res.json())
      .then(data => setArticles(data.data));
    
    // Listen for new articles
    socket.on('article:create', (newArticle) => {
      setArticles(prev => [newArticle, ...prev]);
    });
    
    // Listen for updates
    socket.on('article:update', (updatedArticle) => {
      setArticles(prev => prev.map(article => 
        article.id === updatedArticle.id ? updatedArticle : article
      ));
    });
    
    // Listen for deletions
    socket.on('article:delete', (deletedArticle) => {
      setArticles(prev => prev.filter(article => 
        article.id !== deletedArticle.id
      ));
    });
    
    return () => socket.disconnect();
  }, []);
  
  return (
    <div>
      {articles.map(article => (
        <div key={article.id}>
          <h2>{article.attributes.title}</h2>
          <p>{article.attributes.description}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Use Case 2: User Notifications

### Backend: Send Personalized Notifications

```javascript
// src/api/notification/controllers/notification.js
module.exports = {
  async create(ctx) {
    const { userId, message, type } = ctx.request.body;
    
    // Save notification to DB
    const notification = await strapi.entityService.create(
      'api::notification.notification',
      {
        data: {
          user: userId,
          message,
          type,
          read: false
        }
      }
    );
    
    // Get user's socket room
    const sockets = await strapi.$io.getSocketsInRoom(`user-${userId}`);
    
    // Send real-time notification
    if (sockets.length > 0) {
      strapi.$io.sendPrivateMessage(sockets[0].id, 'notification', {
        id: notification.id,
        message,
        type,
        timestamp: Date.now()
      });
    }
    
    return notification;
  }
};
```

### Frontend: Receive Notifications

```typescript
// hooks/useNotifications.ts
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

export function useNotifications(userId: number, token: string) {
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    const socket = io('http://localhost:1337', {
      auth: { token }
    });
    
    // Join user-specific room
    socket.on('connect', () => {
      socket.emit('join-room', `user-${userId}`);
    });
    
    // Listen for notifications
    socket.on('notification', (notification) => {
      setNotifications(prev => [...prev, notification]);
      
      // Show toast notification
      toast.info(notification.message);
    });
    
    return () => socket.disconnect();
  }, [userId, token]);
  
  return notifications;
}

// Usage in component
function App() {
  const notifications = useNotifications(user.id, user.jwt);
  
  return (
    <div>
      <NotificationBadge count={notifications.length} />
    </div>
  );
}
```

---

## Use Case 3: Live Chat Application

### Backend: Chat API

```javascript
// src/api/chat/routes/chat.js
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/chat/send',
      handler: 'chat.send',
      config: {
        policies: [],
        auth: true
      }
    },
    {
      method: 'GET',
      path: '/chat/rooms',
      handler: 'chat.listRooms',
      config: {
        auth: true
      }
    }
  ]
};

// src/api/chat/controllers/chat.js
module.exports = {
  async send(ctx) {
    const { roomId, message } = ctx.request.body;
    const user = ctx.state.user;
    
    // Validate
    if (!roomId || !message) {
      return ctx.badRequest('Missing required fields');
    }
    
    // Save message
    const chatMessage = await strapi.entityService.create(
      'api::chat-message.chat-message',
      {
        data: {
          content: message,
          room: roomId,
          author: user.id,
          publishedAt: new Date()
        },
        populate: ['author']
      }
    );
    
    // Broadcast to room
    strapi.$io.server.to(`chat-room-${roomId}`).emit('chat:message', {
      id: chatMessage.id,
      content: message,
      author: {
        id: user.id,
        username: user.username,
        avatar: user.avatar?.url
      },
      timestamp: Date.now()
    });
    
    return { success: true, message: chatMessage };
  },
  
  async listRooms(ctx) {
    const rooms = await strapi.entityService.findMany(
      'api::chat-room.chat-room',
      {
        filters: {
          members: {
            id: ctx.state.user.id
          }
        }
      }
    );
    
    return rooms;
  }
};
```

### Frontend: Chat Component

```typescript
// components/Chat.tsx
import { io } from 'socket.io-client';
import { useEffect, useState, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  author: {
    id: number;
    username: string;
    avatar?: string;
  };
  timestamp: number;
}

export default function Chat({ roomId, token }: { roomId: string, token: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const socketRef = useRef(null);
  
  useEffect(() => {
    socketRef.current = io('http://localhost:1337', {
      auth: { token }
    });
    
    const socket = socketRef.current;
    
    socket.on('connect', () => {
      // Join chat room
      socket.emit('join-room', `chat-room-${roomId}`, (response) => {
        if (response.success) {
          console.log('Joined room:', response.room);
        }
      });
    });
    
    // Receive messages
    socket.on('chat:message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });
    
    // Handle typing indicators
    socket.on('chat:typing', ({ username }) => {
      console.log(`${username} is typing...`);
    });
    
    return () => {
      socket.emit('leave-room', `chat-room-${roomId}`);
      socket.disconnect();
    };
  }, [roomId, token]);
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    try {
      await fetch('http://localhost:1337/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId,
          message: input
        })
      });
      
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleTyping = () => {
    socketRef.current?.emit('chat:typing', { roomId });
  };
  
  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className="message">
            <img src={msg.author.avatar} alt={msg.author.username} />
            <div>
              <strong>{msg.author.username}</strong>
              <p>{msg.content}</p>
              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyUp={handleTyping}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

---

## Use Case 4: Admin Dashboard Real-Time Stats

### Backend: Stats Broadcaster

```javascript
// src/index.js
const cron = require('node-cron');

module.exports = {
  async bootstrap({ strapi }) {
    // Broadcast stats every 5 seconds
    cron.schedule('*/5 * * * * *', async () => {
      try {
        const monitoringService = strapi.plugin('io').service('monitoring');
        const connectionStats = monitoringService.getConnectionStats();
        
        // Get business metrics
        const [userCount, articleCount, orderCount] = await Promise.all([
          strapi.db.query('plugin::users-permissions.user').count(),
          strapi.db.query('api::article.article').count(),
          strapi.db.query('api::order.order').count({
            where: {
              createdAt: {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
              }
            }
          })
        ]);
        
        // Broadcast to admin namespace
        strapi.$io.emitToNamespace('admin', 'dashboard:stats', {
          connections: {
            active: connectionStats.connected,
            rooms: connectionStats.rooms.length
          },
          metrics: {
            users: userCount,
            articles: articleCount,
            ordersToday: orderCount
          },
          timestamp: Date.now()
        });
      } catch (error) {
        strapi.log.error('Stats broadcast failed:', error);
      }
    });
  }
};
```

### Frontend: Live Dashboard

```typescript
// pages/admin/Dashboard.tsx
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

interface DashboardStats {
  connections: {
    active: number;
    rooms: number;
  };
  metrics: {
    users: number;
    articles: number;
    ordersToday: number;
  };
  timestamp: number;
}

export default function Dashboard({ adminToken }: { adminToken: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  useEffect(() => {
    const socket = io('http://localhost:1337/admin', {
      auth: { token: adminToken }
    });
    
    socket.on('connect', () => {
      setIsLive(true);
      console.log('🟢 Dashboard live');
    });
    
    socket.on('disconnect', () => {
      setIsLive(false);
      console.log('🔴 Dashboard disconnected');
    });
    
    socket.on('dashboard:stats', (newStats: DashboardStats) => {
      setStats(newStats);
    });
    
    return () => socket.disconnect();
  }, [adminToken]);
  
  if (!stats) {
    return <div>Loading dashboard...</div>;
  }
  
  return (
    <div className="dashboard">
      <div className="status">
        <span className={isLive ? 'live' : 'offline'}>
          {isLive ? '🟢 Live' : '🔴 Offline'}
        </span>
      </div>
      
      <div className="stats-grid">
        <StatCard
          title="Active Connections"
          value={stats.connections.active}
          icon="👥"
        />
        <StatCard
          title="Active Rooms"
          value={stats.connections.rooms}
          icon="🚪"
        />
        <StatCard
          title="Total Users"
          value={stats.metrics.users}
          icon="👤"
        />
        <StatCard
          title="Articles"
          value={stats.metrics.articles}
          icon="📝"
        />
        <StatCard
          title="Orders Today"
          value={stats.metrics.ordersToday}
          icon="🛒"
        />
      </div>
      
      <div className="last-update">
        Last update: {new Date(stats.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div className="icon">{icon}</div>
      <div className="content">
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
    </div>
  );
}
```

---

## Use Case 5: Collaborative Editing

### Backend: Track Active Editors

```javascript
// src/api/document/controllers/document.js
module.exports = {
  async startEditing(ctx) {
    const { documentId } = ctx.params;
    const user = ctx.state.user;
    
    // Join document room
    const stats = strapi.plugin('io').service('monitoring').getConnectionStats();
    const userSocket = stats.sockets.find(s => s.user?.id === user.id);
    
    if (userSocket) {
      strapi.$io.joinRoom(userSocket.id, `document-${documentId}`);
      
      // Notify others
      strapi.$io.server.to(`document-${documentId}`).emit('editor:joined', {
        userId: user.id,
        username: user.username,
        avatar: user.avatar?.url
      });
    }
    
    // Get active editors
    const editors = await strapi.$io.getSocketsInRoom(`document-${documentId}`);
    
    return {
      documentId,
      activeEditors: editors.map(e => e.user).filter(Boolean)
    };
  },
  
  async broadcastChange(ctx) {
    const { documentId, changes } = ctx.request.body;
    const user = ctx.state.user;
    
    // Broadcast changes to other editors (exclude sender)
    const stats = strapi.plugin('io').service('monitoring').getConnectionStats();
    const userSocket = stats.sockets.find(s => s.user?.id === user.id);
    
    if (userSocket) {
      strapi.$io.broadcast(userSocket.id, 'document:change', {
        documentId,
        changes,
        author: {
          id: user.id,
          username: user.username
        },
        timestamp: Date.now()
      });
    }
    
    return { success: true };
  }
};
```

### Frontend: Collaborative Editor

```typescript
// components/CollaborativeEditor.tsx
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

export default function CollaborativeEditor({ 
  documentId, 
  token 
}: { 
  documentId: string; 
  token: string;
}) {
  const [content, setContent] = useState('');
  const [activeEditors, setActiveEditors] = useState([]);
  const socketRef = useRef(null);
  
  useEffect(() => {
    const socket = io('http://localhost:1337', {
      auth: { token }
    });
    
    socketRef.current = socket;
    
    // Start editing session
    fetch(`http://localhost:1337/api/document/${documentId}/start-editing`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setActiveEditors(data.activeEditors);
      });
    
    // Listen for other editors joining
    socket.on('editor:joined', (editor) => {
      setActiveEditors(prev => [...prev, editor]);
    });
    
    // Listen for content changes
    socket.on('document:change', ({ changes, author }) => {
      // Apply changes to editor
      applyChanges(changes);
    });
    
    return () => {
      socket.emit('leave-room', `document-${documentId}`);
      socket.disconnect();
    };
  }, [documentId, token]);
  
  const handleChange = (newContent: string) => {
    setContent(newContent);
    
    // Broadcast changes
    fetch(`http://localhost:1337/api/document/${documentId}/broadcast-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        documentId,
        changes: computeChanges(content, newContent)
      })
    });
  };
  
  return (
    <div>
      <div className="active-editors">
        {activeEditors.map(editor => (
          <div key={editor.userId} className="editor-badge">
            <img src={editor.avatar} alt={editor.username} />
            <span>{editor.username}</span>
          </div>
        ))}
      </div>
      
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start typing..."
      />
    </div>
  );
}
```

---

## Use Case 6: Order Status Tracking

### Backend: Update Order Status

```javascript
// src/api/order/content-types/order/lifecycles.js
module.exports = {
  async afterUpdate(event) {
    const { result, params } = event;
    
    // Check if status changed
    if (params.data.status) {
      // Notify customer
      const customer = result.customer;
      const sockets = await strapi.$io.getSocketsInRoom(`user-${customer.id}`);
      
      if (sockets.length > 0) {
        strapi.$io.sendPrivateMessage(sockets[0].id, 'order:status-update', {
          orderId: result.id,
          status: result.status,
          statusMessage: getStatusMessage(result.status),
          trackingUrl: result.trackingUrl
        });
      }
      
      // Log event
      strapi.plugin('io').service('monitoring').logEvent('order-update', {
        orderId: result.id,
        status: result.status,
        customerId: customer.id
      });
    }
  }
};

function getStatusMessage(status) {
  const messages = {
    'pending': 'Your order is being processed',
    'confirmed': 'Your order has been confirmed',
    'shipped': 'Your order is on its way!',
    'delivered': 'Your order has been delivered',
    'cancelled': 'Your order has been cancelled'
  };
  return messages[status] || 'Order status updated';
}
```

### Frontend: Order Tracking Page

```typescript
// pages/orders/[id].tsx
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function OrderTracking({ token }: { token: string }) {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [statusUpdates, setStatusUpdates] = useState([]);
  
  useEffect(() => {
    // Fetch initial order data
    fetch(`http://localhost:1337/api/orders/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setOrder(data.data));
    
    // Connect to Socket.IO
    const socket = io('http://localhost:1337', {
      auth: { token }
    });
    
    // Listen for status updates
    socket.on('order:status-update', (update) => {
      if (update.orderId === id) {
        setStatusUpdates(prev => [...prev, update]);
        setOrder(prev => ({
          ...prev,
          attributes: {
            ...prev.attributes,
            status: update.status
          }
        }));
        
        // Show notification
        toast.success(update.statusMessage);
      }
    });
    
    return () => socket.disconnect();
  }, [id, token]);
  
  if (!order) return <div>Loading...</div>;
  
  return (
    <div className="order-tracking">
      <h1>Order #{order.id}</h1>
      
      <div className="status-timeline">
        {['pending', 'confirmed', 'shipped', 'delivered'].map(status => (
          <div
            key={status}
            className={`status-step ${
              order.attributes.status === status ? 'active' : ''
            }`}
          >
            {status}
          </div>
        ))}
      </div>
      
      <div className="status-updates">
        <h2>Live Updates</h2>
        {statusUpdates.map((update, i) => (
          <div key={i} className="update">
            <span className="time">
              {new Date(update.timestamp).toLocaleString()}
            </span>
            <p>{update.statusMessage}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Advanced Patterns

### Pattern 1: Custom Event Handlers

```javascript
// src/extensions/socket-handlers.js
module.exports = {
  register({ strapi }) {
    // Wait for Socket.IO to initialize
    strapi.$io?.server?.on('connection', (socket) => {
      
      // Custom event: User presence
      socket.on('user:online', async () => {
        if (socket.user) {
          await strapi.entityService.update(
            'plugin::users-permissions.user',
            socket.user.id,
            { data: { isOnline: true, lastSeen: new Date() } }
          );
          
          // Broadcast to friends
          socket.broadcast.emit('friend:online', {
            userId: socket.user.id,
            username: socket.user.username
          });
        }
      });
      
      socket.on('disconnect', async () => {
        if (socket.user) {
          await strapi.entityService.update(
            'plugin::users-permissions.user',
            socket.user.id,
            { data: { isOnline: false, lastSeen: new Date() } }
          );
        }
      });
    });
  }
};
```

### Pattern 2: Rate Limiting Custom Events

```javascript
// Prevent abuse of custom events
const rateLimiters = new Map();

strapi.$io.server.on('connection', (socket) => {
  rateLimiters.set(socket.id, {
    count: 0,
    resetAt: Date.now() + 60000 // 1 minute
  });
  
  socket.use((packet, next) => {
    const limiter = rateLimiters.get(socket.id);
    const now = Date.now();
    
    if (now > limiter.resetAt) {
      limiter.count = 0;
      limiter.resetAt = now + 60000;
    }
    
    limiter.count++;
    
    if (limiter.count > 60) { // Max 60 events per minute
      return next(new Error('Rate limit exceeded'));
    }
    
    next();
  });
  
  socket.on('disconnect', () => {
    rateLimiters.delete(socket.id);
  });
});
```

### Pattern 3: Room-Based Broadcasting

```javascript
// Broadcast to specific user groups
async function notifyPremiumUsers(message) {
  const premiumUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
    where: { isPremium: true }
  });
  
  const stats = strapi.plugin('io').service('monitoring').getConnectionStats();
  
  premiumUsers.forEach(user => {
    const userSocket = stats.sockets.find(s => s.user?.id === user.id);
    if (userSocket) {
      strapi.$io.sendPrivateMessage(userSocket.id, 'premium:notification', {
        message,
        type: 'exclusive',
        timestamp: Date.now()
      });
    }
  });
}
```

---

## Testing

### Test Socket.IO Connection

```javascript
// test/socket.test.js
const { io } = require('socket.io-client');

describe('Socket.IO Plugin', () => {
  let socket;
  
  beforeAll(() => {
    socket = io('http://localhost:1337', {
      transports: ['websocket']
    });
  });
  
  afterAll(() => {
    socket.disconnect();
  });
  
  test('should connect successfully', (done) => {
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      done();
    });
  });
  
  test('should join room', (done) => {
    socket.emit('join-room', 'test-room', (response) => {
      expect(response.success).toBe(true);
      expect(response.room).toBe('test-room');
      done();
    });
  });
  
  test('should receive test event', (done) => {
    socket.on('test', (data) => {
      expect(data.test).toBe(true);
      done();
    });
    
    // Trigger test event from backend
    fetch('http://localhost:1337/api/test-event', {
      method: 'POST'
    });
  });
});
```

---

## Production Checklist

### Security
- [ ] Enable authentication requirement
- [ ] Configure CORS origins
- [ ] Set connection limits
- [ ] Enable rate limiting
- [ ] Review role permissions

### Performance
- [ ] Enable Redis adapter for scaling
- [ ] Disable event logging
- [ ] Set appropriate ping timeouts
- [ ] Monitor connection stats

### Monitoring
- [ ] Set up logging
- [ ] Track connection metrics
- [ ] Monitor error rates
- [ ] Set up alerts

---

## Troubleshooting

### Connection Issues

```javascript
// Debug connection
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
  
  // Check:
  // 1. Server is running
  // 2. CORS configured correctly
  // 3. Token is valid (if using auth)
  // 4. Max connections not reached
});
```

### Events Not Received

```javascript
// Verify content type is enabled
const settings = await strapi.plugin('io').service('settings').getSettings();
console.log('Role permissions:', settings.rolePermissions);

// Check if user has permission for the content type
```

### Performance Issues

```javascript
// Monitor stats
const monitoringService = strapi.plugin('io').service('monitoring');
const stats = monitoringService.getConnectionStats();
const events = monitoringService.getEventStats();

console.log(`Connections: ${stats.connected}`);
console.log(`Events/sec: ${events.eventsPerSecond}`);
```

---

## Next Steps

1. **Explore API Reference**: See [API.md](./API.md) for complete API documentation
2. **Review Security**: Check [SECURITY.md](./SECURITY.md) for security best practices
3. **Optimize Performance**: Read [OPTIMIZATIONS.md](./OPTIMIZATIONS.md) for performance tips
4. **Check Features**: See [FEATURES.md](./FEATURES.md) for full feature list

---

**Need help?** Open an issue on [GitHub](https://github.com/ComfortablyCoding/strapi-plugin-io/issues)
