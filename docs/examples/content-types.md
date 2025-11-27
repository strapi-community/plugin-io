# Content Types Examples

Learn how to configure and monitor content types for real-time events.

---

## Basic Configuration

The `contentTypes` configuration controls which content types emit events to connected clients. It supports two formats: **string** and **object**.

### String Format (Simple)

Use the content type UID directly to enable all events:

```javascript
module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      contentTypes: [
        'api::article.article',
        'api::comment.comment',
        'api::product.product'
      ]
    }
  }
});
```

**This automatically enables:**
- ✅ Create events (`article:create`)
- ✅ Update events (`article:update`)
- ✅ Delete events (`article:delete`)

---

## Object Format (Advanced)

For fine-grained control, use the object format to specify exactly which actions should emit events:

```javascript
module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      contentTypes: [
        // Only create events
        {
          uid: 'api::article.article',
          actions: ['create']
        },
        
        // Create and update, no delete
        {
          uid: 'api::product.product',
          actions: ['create', 'update']
        },
        
        // All events (same as string format)
        {
          uid: 'api::comment.comment',
          actions: ['create', 'update', 'delete']
        }
      ]
    }
  }
});
```

### Available Actions

| Action | Event Name | Description |
|--------|-----------|-------------|
| `create` | `{contentType}:create` | Fired when entry is created |
| `update` | `{contentType}:update` | Fired when entry is updated |
| `delete` | `{contentType}:delete` | Fired when entry is deleted |

---

## Advanced Features

### Include Relations

Populate relations automatically in emitted events:

```javascript
contentTypes: [
  {
    uid: 'api::article.article',
    actions: ['create', 'update'],
    populate: ['author', 'category', 'tags']
  }
]
```

**Frontend receives:**

```javascript
socket.on('article:create', (article) => {
  console.log(article.attributes.author);  // ✅ Populated
  console.log(article.attributes.category); // ✅ Populated
  console.log(article.attributes.tags);     // ✅ Populated
});
```

### Custom Event Names

Override default event naming:

```javascript
contentTypes: [
  {
    uid: 'api::article.article',
    actions: ['create'],
    eventPrefix: 'new-article'  // Emits as 'new-article:create'
  }
]
```

**Frontend listens to:**

```javascript
socket.on('new-article:create', (data) => {
  console.log('New article published!', data);
});
```

---

## Real-World Examples

### Blog Platform

```javascript
// config/plugins.js
module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: [
        // Articles - all events with relations
        {
          uid: 'api::article.article',
          actions: ['create', 'update', 'delete'],
          populate: ['author', 'category', 'coverImage']
        },
        
        // Comments - only create
        {
          uid: 'api::comment.comment',
          actions: ['create'],
          populate: ['author']
        },
        
        // Categories - all events, no relations
        'api::category.category'
      ]
    }
  }
};
```

**Frontend:**

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337');

// New articles
socket.on('article:create', (article) => {
  addArticleToFeed(article);
  showNotification(`New article: ${article.attributes.title}`);
});

// Article updates
socket.on('article:update', (article) => {
  updateArticleInFeed(article);
});

// New comments
socket.on('comment:create', (comment) => {
  addCommentToArticle(comment);
  playNotificationSound();
});
```

### E-Commerce Store

```javascript
// config/plugins.js
module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: [
        // Products - create and update only
        {
          uid: 'api::product.product',
          actions: ['create', 'update'],
          populate: ['images', 'category', 'variants']
        },
        
        // Orders - all events
        {
          uid: 'api::order.order',
          actions: ['create', 'update'],
          populate: ['customer', 'items']
        },
        
        // Stock updates
        {
          uid: 'api::inventory.inventory',
          actions: ['update']
        }
      ]
    }
  }
};
```

**Frontend:**

```javascript
// Product page - update price/stock in real-time
socket.on('product:update', (product) => {
  if (product.id === currentProductId) {
    updatePrice(product.attributes.price);
    updateStock(product.attributes.stock);
    
    if (product.attributes.stock === 0) {
      showOutOfStockBanner();
    }
  }
});

// Cart page - notify about stock changes
socket.on('inventory:update', (inventory) => {
  const cartItem = findCartItem(inventory.productId);
  if (cartItem && inventory.stock < cartItem.quantity) {
    showLowStockWarning(inventory);
  }
});
```

### Admin Dashboard

```javascript
// config/plugins.js
module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: [
        // Monitor all user activities
        {
          uid: 'plugin::users-permissions.user',
          actions: ['create', 'update'],
          populate: ['role']
        },
        
        // Track content creation
        'api::article.article',
        'api::comment.comment',
        'api::media.media',
        
        // Monitor orders
        {
          uid: 'api::order.order',
          actions: ['create', 'update'],
          populate: ['customer', 'items']
        }
      ]
    }
  }
};
```

**Admin Frontend:**

```javascript
const socket = io('http://localhost:1337/admin', {
  auth: { strategy: 'api-token', token: adminToken }
});

// Live activity feed
socket.on('article:create', (article) => {
  addToActivityFeed('New article published', article);
});

socket.on('user:create', (user) => {
  addToActivityFeed('New user registered', user);
  updateUserCount();
});

socket.on('order:create', (order) => {
  addToActivityFeed('New order received', order);
  playNotificationSound();
  updateRevenue(order.attributes.total);
});
```

---

## Filtering Events

### By Published Status

Only emit events for published content:

```javascript
// src/api/article/content-types/article/lifecycles.js
module.exports = {
  async afterCreate(event) {
    const { result } = event;
    
    // Only emit if published
    if (result.publishedAt) {
      await strapi.$io.emit({
        event: 'create',
        schema: 'api::article.article',
        data: result
      });
    }
  }
};
```

### By User Role

Control which roles receive which events via Admin Panel:

**Settings → Socket.IO → Role Permissions**

1. Select **Public** role:
   - Enable `article:create` ✅
   - Disable `article:delete` ❌
   
2. Select **Authenticated** role:
   - Enable all article events ✅

---

## Performance Optimization

### Limit Fields

Reduce payload size by excluding heavy fields:

```javascript
// In Admin Panel Settings
events: {
  excludeFields: ['content', 'largeData', 'internalNotes']
}
```

Or programmatically:

```javascript
// src/api/article/content-types/article/lifecycles.js
module.exports = {
  async afterCreate(event) {
    const { result } = event;
    
    // Custom emit with limited fields
    await strapi.$io.raw({
      event: 'article:create',
      data: {
        id: result.id,
        title: result.title,
        excerpt: result.excerpt,
        author: result.author.username
        // Exclude heavy content field
      }
    });
  }
};
```

### Debounce Bulk Operations

Prevent event flooding during imports:

```javascript
const { debounce } = require('lodash');

const emitBulkUpdate = debounce((ids) => {
  strapi.$io.raw({
    event: 'articles:bulk-update',
    data: { updatedIds: ids }
  });
}, 1000);

// In bulk operation
bulkUpdate.forEach(async (article) => {
  await strapi.entityService.update('api::article.article', article.id, {
    data: article
  });
  emitBulkUpdate(article.id);
});
```

---

## Testing

### Test Event Emission

```javascript
// test/content-types.test.js
const { io } = require('socket.io-client');

describe('Content Type Events', () => {
  let socket;
  
  beforeAll(() => {
    socket = io('http://localhost:1337');
  });
  
  afterAll(() => {
    socket.disconnect();
  });
  
  test('should receive article:create event', (done) => {
    socket.on('article:create', (article) => {
      expect(article).toHaveProperty('id');
      expect(article.attributes).toHaveProperty('title');
      done();
    });
    
    // Create article via API
    fetch('http://localhost:1337/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          title: 'Test Article',
          content: 'Test content'
        }
      })
    });
  });
});
```

---

## Troubleshooting

### Events Not Received

**Check content type is enabled:**

```javascript
const settings = await strapi.plugin('io').service('settings').getSettings();
console.log('Enabled content types:', settings.contentTypes);
```

**Check role permissions:**

Navigate to **Settings → Socket.IO → Role Permissions** and verify the role has access.

**Verify event name:**

Events follow the pattern `{singularName}:{action}`. For `api::article.article`, events are:
- `article:create`
- `article:update`
- `article:delete`

---

## See Also

- **[Plugin Configuration](/api/plugin-config)** - Complete configuration reference
- **[Events Examples](/examples/events)** - Custom event handlers
- **[API Reference](/api/io-class)** - Emit methods and options
