# Homepage widgets

The plugin adds two widgets to the Strapi admin homepage through Strapi's official Widget API. They look and behave like Strapi's own widgets and can be arranged or removed with **Add Widget** on the homepage.

Both widgets need the admin permission **Read monitoring** (`plugin::io.monitoring.read`). Super Admins have it; grant it to other roles under _Settings > Administration panel > Roles > Plugins > IO > Monitoring_.

---

## Socket.IO

![Socket.IO homepage widget](/widget.png)

Laid out like the native _Project statistics_ widget: four cells, each opening _Settings > Socket.IO > Monitoring_.

| Cell              | Meaning                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| Connected clients | Sockets connected right now (admins, users, API tokens and public clients). |
| Admins online     | Admins with the Content Manager open.                                       |
| Events per second | Average over the last 10 seconds.                                           |
| Events sent       | Events emitted since the last restart or reset.                             |

The widget refreshes every 15 seconds.

## Admins online

![Admins online homepage widget](/admins-online-widget.png)

Laid out like the native _Last edited entries_ widget: one row per other admin with the Content Manager open, the content type they are editing and when they connected. Click a row or the edit button to open the same entry. Your own session is not listed. The widget refreshes every 15 seconds.

The list contains names only. Emails, IP addresses and socket ids are never sent to the browser. Entries in content types you may not read in the Content Manager are not named: the row says _An entry you cannot view_ instead (Monitoring shows a count).

---

## States

- **Loading** and **error** use Strapi's native widget states. On an error, **Try again** reloads the data.
- **Admins online** shows "No other admins are editing right now." when nobody else is editing.
- When the presence feature is off in the settings, nobody appears in _Admins online_.

## Monitoring page

![Settings > Socket.IO > Monitoring](/monitoringSettings.png)

_Settings > Socket.IO > Monitoring_ shows the same counters with a breakdown by client type, the admins online with the entries they edit, and the event log (turn on **Keep an event log** in the settings). Roles with **Reset statistics and send test events** (`plugin::io.monitoring.manage`) can send a test event and reset the statistics.

## Troubleshooting

**The widgets do not appear.** Check that your Strapi version is 5.38 or later (the plugin requirement) and that your role has `plugin::io.monitoring.read`. Then rebuild the admin (`npm run build`).

**Connected clients stays at 0.** No client is connected. Connect one and wait for the next refresh:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:1337', { transports: ['websocket'] });
socket.on('connect', () => console.log('connected', socket.id));
```

**Admins online is empty while someone edits.** **Show who is editing** must be on (_Settings > Socket.IO > Settings > Live presence_), and the other admin needs read permission for that content type in the Content Manager.

## See also

- [Getting Started](/guide/getting-started)
- [IO class](/api/io-class)
- [Configuration](/api/plugin-config)
