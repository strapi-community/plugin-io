# Socket.IO Dashboard Widget

**Live Statistics Widget for Strapi v5 Admin Panel**

---

## 📊 Features

The Socket.IO plugin includes a **dashboard widget** that displays real-time statistics directly on your Strapi admin home page.

### Widget Display

<img width="600" alt="Socket.IO Widget" src="docs/widget-preview.png">

**Key Metrics:**
- 🟢 **Live Indicator** - Shows connection status with pulsing animation
- 👥 **Active Connections** - Real-time count of connected sockets
- 💬 **Active Rooms** - Number of active Socket.IO rooms
- ⚡ **Events/sec** - Current event emission rate
- 📊 **Total Events** - Cumulative event count since last reset

---

## 🎨 Visual Design

### Color-Coded Stats
- **Blue (Primary)** - Active Connections
- **Green (Success)** - Active Rooms
- **Orange (Warning)** - Events per Second

### Live Status
- **Green Pulsing Dot** - Socket.IO is active and receiving data
- **Red Dot** - Socket.IO is offline or not responding

### Hover Effects
- Cards scale up on hover
- Border color changes to primary
- Subtle shadow for depth

---

## 🔄 Auto-Refresh

The widget **automatically updates every 5 seconds** with fresh data:

```javascript
// Auto-polling implementation
useEffect(() => {
  fetchStats(); // Initial fetch
  
  const interval = setInterval(fetchStats, 5000); // Every 5 seconds
  
  return () => clearInterval(interval); // Cleanup
}, []);
```

---

## 📍 Location

The widget appears on the **Strapi Admin Home Page** (Dashboard):

1. Navigate to: `http://localhost:1337/admin`
2. The widget is automatically displayed in the main dashboard area
3. Takes up 8/12 columns (customizable)

---

## ⚙️ Configuration

### Widget Width

The widget width can be adjusted in `admin/src/index.js`:

```javascript
app.addWidget({
  id: `${PLUGIN_ID}-stats-widget`,
  intlLabel: {
    id: `${PLUGIN_ID}.widget.title`,
    defaultMessage: 'Socket.IO Statistics',
  },
  Component: () => import('./components/SocketStatsWidget').then((mod) => ({ default: mod.SocketStatsWidget })),
  width: 8, // 👈 Change this (1-12, 12 = full width)
});
```

### Refresh Interval

Modify the polling interval in `SocketStatsWidget.jsx`:

```javascript
// Change 5000 to desired milliseconds
const interval = setInterval(fetchStats, 5000);
```

---

## 🔗 Quick Actions

### View Details Link
Click **"View Details →"** at the bottom of the widget to navigate to the full monitoring page:
- Connection details
- Socket list with user info
- Event logs
- Performance metrics

---

## 🛠️ Technical Details

### API Endpoint
```
GET /api/io/monitoring/stats
```

### Response Format
```json
{
  "data": {
    "connections": {
      "connected": 42,
      "rooms": [
        { "name": "admin-room", "members": 5 },
        { "name": "chat-public", "members": 37 }
      ]
    },
    "events": {
      "totalEvents": 15234,
      "eventsPerSecond": 3.45,
      "eventsByType": {
        "connection": 42,
        "article:create": 125,
        "article:update": 203
      }
    },
    "timestamp": 1732634040000
  }
}
```

### Components Used
- `@strapi/design-system` - UI components
- `lucide-react` - Icons
- `styled-components` - Styling
- `useFetchClient` - API calls

---

## 🎯 Permissions

The widget is **visible to all authenticated admin users**. The underlying API endpoint requires:

```javascript
policies: ['admin::isAuthenticatedAdmin']
```

---

## 🔍 Error Handling

### No Socket.IO Running
If Socket.IO is not initialized, the widget displays:
```
⚠️ Failed to load Socket.IO stats
Socket.IO not initialized
```

### API Error
If the API endpoint fails:
```
⚠️ Failed to load Socket.IO stats
[Error message from API]
```

### Loading State
While fetching initial data:
```
Loading...
```

---

## 🚀 Development

### Local Testing

1. Start Strapi:
```bash
npm run develop
```

2. Navigate to admin panel:
```
http://localhost:1337/admin
```

3. Widget should appear on home page

### Customization

The widget component is located at:
```
admin/src/components/SocketStatsWidget.jsx
```

Feel free to customize:
- Colors and styling
- Displayed metrics
- Refresh interval
- Layout and design

---

## 📱 Responsive Design

The widget adapts to different screen sizes:
- **Desktop** - 3 stat boxes side-by-side
- **Tablet** - 2 stat boxes per row
- **Mobile** - 1 stat box per row (stacked)

Implemented using Flexbox with `wrap`:
```javascript
<Flex gap={3} wrap="wrap">
  {/* Stats automatically wrap on smaller screens */}
</Flex>
```

---

## 🎨 Theming

The widget respects your Strapi theme:

```javascript
const StyledCard = styled(Box)`
  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  // ... uses theme colors throughout
`;
```

Works perfectly with:
- ✅ Light theme
- ✅ Dark theme
- ✅ Custom themes

---

## 📊 Use Cases

### 1. Quick Health Check
Glance at the dashboard to ensure Socket.IO is running and processing events.

### 2. Performance Monitoring
Track events/sec to identify performance bottlenecks.

### 3. User Activity
See how many users are connected in real-time.

### 4. Room Monitoring
Quickly check which rooms are most active.

---

## 🔧 Troubleshooting

### Widget Not Showing

**Check 1:** Plugin is enabled
```javascript
// config/plugins.js
module.exports = {
  'io': {
    enabled: true, // ✅ Must be true
  }
};
```

**Check 2:** Widget is registered
```javascript
// admin/src/index.js - bootstrap() method
app.addWidget({ ... });
```

**Check 3:** Rebuild admin
```bash
npm run build
```

### Stats Not Updating

**Check 1:** Socket.IO is running
```bash
# Check Strapi logs for:
socket.io: Plugin initialized
```

**Check 2:** API endpoint is accessible
```bash
curl http://localhost:1337/api/io/monitoring/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check 3:** Browser console for errors
```
F12 → Console → Look for fetch errors
```

---

## 🎉 Benefits

✅ **No Configuration Needed** - Works out of the box  
✅ **Real-Time Updates** - Auto-refreshes every 5 seconds  
✅ **Lightweight** - Minimal performance impact  
✅ **Beautiful UI** - Matches Strapi design system  
✅ **Responsive** - Works on all screen sizes  
✅ **Accessible** - Follows WCAG guidelines  
✅ **Themed** - Respects light/dark themes  

---

## 📚 Related Documentation

- [API.md](./API.md) - Complete API reference
- [USAGE-GUIDE.md](./USAGE-GUIDE.md) - Usage examples
- [README.md](./README.md) - Plugin overview

---

**Last Updated:** 2025-11-26  
**Plugin Version:** 3.x.x  
**Strapi Version:** 5.x.x
