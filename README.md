# @strapi-community/plugin-io

> Real-time content events for Strapi 5 with Socket.IO, scoped by Strapi's own permissions.

[![NPM Version](https://img.shields.io/npm/v/@strapi-community/plugin-io?style=flat-square)](https://www.npmjs.com/package/@strapi-community/plugin-io)
[![NPM Downloads](https://img.shields.io/npm/dm/@strapi-community/plugin-io?style=flat-square)](https://www.npmjs.com/package/@strapi-community/plugin-io)
[![License](https://img.shields.io/npm/l/@strapi-community/plugin-io?style=flat-square)](https://github.com/strapi-community/plugin-io/blob/main/LICENSE)
[![Strapi Version](https://img.shields.io/badge/strapi-v5-blueviolet?style=flat-square)](https://strapi.io)

The plugin attaches a Socket.IO server to Strapi's HTTP server and sends an event whenever a watched document is created, updated, published, unpublished, has its draft discarded or is deleted. Each client receives only what its role or API token may read through the REST API, sanitized with the same Content API sanitizer Strapi uses.

Full documentation: <https://strapi-community.github.io/plugin-io/>

## Contents

- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Content events](#content-events)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Admin panel](#admin-panel)
- [Server API](#server-api)
- [Security model](#security-model)
- [Scaling with Redis](#scaling-with-redis)
- [Upgrading from 5.x](#upgrading-from-5x)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Requirements

|                     | Version                                                  |
| ------------------- | -------------------------------------------------------- |
| Strapi              | 5.13 or later (tested with 5.61)                         |
| Node.js             | 22 or 24 (same range as Strapi 5.61: `>=22 <=26`)        |
| Users & Permissions | Optional. Needed for user JWTs and the Public role room. |

## Quick start

```bash
npm install @strapi-community/plugin-io
```

`config/plugins.js`:

```js
module.exports = {
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
    },
  },
};
```

Give the Public role (or any role) the **find** permission for Article in _Settings > Users & Permissions > Roles_, then connect from a frontend:

```js
import { io } from 'socket.io-client';

const socket = io('https://cms.example.com');

socket.on('article:publish', ({ data }) => console.log('Published', data.attributes.title));
socket.on('article:delete', ({ data }) => console.log('Deleted', data.documentId, data.locale));
```

Browsers that connect from another origin must be listed under _Settings > Socket.IO > Settings > Allowed origins_ (or in `socket.serverOptions.cors`).

## Content events

Events are named `<singularName>:<action>`. Content types are watched from the config (fixed) or chosen in the admin settings (editable).

| Action         | When                                      | Payload                              |
| -------------- | ----------------------------------------- | ------------------------------------ |
| `create`       | A document is created                     | `{ data: { id, attributes }, meta }` |
| `update`       | A document is updated                     | `{ data: { id, attributes }, meta }` |
| `publish`      | A draft is published                      | `{ data: { id, attributes }, meta }` |
| `discardDraft` | A draft is reset to the published version | `{ data: { id, attributes }, meta }` |
| `unpublish`    | A document is unpublished                 | `{ data: { documentId, locale? } }`  |
| `delete`       | A document (locale) is deleted            | `{ data: { documentId, locale? } }`  |

- **Who receives an event:** every Users & Permissions role and content API token with `find` or `findOne` permission on the content type. Read-only and full-access tokens receive all events. Roles that may only create or update receive nothing.
- **Drafts:** with Draft & Publish, draft versions are not sent while _Only published content_ is on (the default). Turn it off to send drafts to the roles that may read them.
- **Locales:** one event per locale. Events are emitted after the database transaction commits.
- **Populate:** `populate` refetches the entry with the same locale and status before it is sent.
- **Sanitizing:** each audience gets the entry sanitized with its own permissions. Private fields, password fields, built-in secrets (`password`, `resetPasswordToken`, `apiKey`, `secret`, ...), `config.sensitiveFields` and the _Excluded fields_ setting are removed. If sanitizing fails, that audience is skipped and nothing is sent.

Events come from Strapi's Document Service middleware (`strapi.documents.use`). Writes made directly with `strapi.db.query()` do not emit events.

## Authentication

Clients authenticate in the Socket.IO handshake:

```js
// Users & Permissions JWT (legacy and refresh mode)
io(url, { auth: { strategy: 'jwt', token: userJwt } });

// Content API token
io(url, { auth: { strategy: 'api-token', token: apiToken } });

// No token: the client joins the Public role (unless "Require authentication" is on)
io(url);
```

| Strategy                               | Room                                                | Notes                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `jwt`                                  | `io-role-<role type>`, e.g. `io-role-authenticated` | Blocked and unconfirmed users are rejected. The socket is disconnected when the JWT expires, the user is blocked or the role changes. |
| `api-token` (also `apiToken`, `token`) | `io-token-<token id>`                               | Content API tokens only; admin tokens are rejected. Disconnected when the token is deleted or expires.                                |
| none                                   | `io-role-public`                                    | Only while _Require authentication_ is off.                                                                                           |

Failed handshakes return one generic message (`Authentication failed`). After 20 failures from the same IP within a minute, that IP is locked out for the rest of the minute. The client IP follows Strapi's `server.proxy` settings.

For refresh-mode JWTs, pass a function so that reconnects use a fresh access token:

```js
io(url, { auth: (cb) => getAccessToken().then((token) => cb({ strategy: 'jwt', token })) });
```

## Configuration

```js
// config/plugins.js
module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      // Fixed watch list. Strings watch every action.
      contentTypes: [
        'api::article.article',
        { uid: 'api::page.page', actions: ['publish', 'unpublish', 'delete'], populate: ['seo', 'cover'] },
      ],

      // Extra field names that are never sent.
      sensitiveFields: ['internalNotes'],

      // Custom client events.
      events: [
        { name: 'connection', handler: ({ strapi }, socket) => strapi.log.debug(`[io] ${socket.id} connected`) },
        { name: 'ping', handler: (_ctx, socket) => socket.emit('pong') },
      ],

      // Runs once during bootstrap (awaited). Use it for adapters or custom namespaces.
      hooks: {
        async init({ strapi, $io }) {},
      },

      // Socket.IO server options. Values here win over the admin settings.
      socket: {
        serverOptions: {
          // cors: { origin: ['https://app.example.com'] },
          // maxHttpBufferSize: 1e6,
        },
      },
    },
  },
});
```

Defaults the plugin sets unless you override them in `socket.serverOptions`:

| Option                                          | Default                 | Why                                                                                                             |
| ----------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `destroyUpgrade`                                | `false`                 | Foreign upgrades (Strapi Data Transfer) are forwarded to Strapi instead of being closed.                        |
| `maxHttpBufferSize`                             | `1e5` (100 KB)          | Limits the size of messages clients send. Socket.IO's default is 1 MB.                                          |
| `cors` / `allowRequest`                         | from _Allowed origins_  | Applies the same origin rule to polling and WebSocket upgrades. The Strapi admin (same host) is always allowed. |
| `pingInterval`, `pingTimeout`, `connectTimeout` | from the admin settings | Applied to new connections without a restart.                                                                   |

## Admin panel

The plugin adds a **Socket.IO** section under _Settings_ with two pages, two homepage widgets and a side panel in the Content Manager. All screens use the Strapi Design System and follow the layout of the native settings pages.

![Settings > Socket.IO > Settings](./pics/settings.png)

**Settings** (`plugin::io.settings.read` / `plugin::io.settings.update`). Every setting applies to new connections without a restart:

| Section        | Settings                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connections    | Allowed origins, maximum connections (0 = unlimited), ping interval, ping timeout, connection timeout                                              |
| Security       | Require authentication, limit client events (events per second per client), allowed IP addresses, blocked IP addresses (addresses and CIDR blocks) |
| Content events | Only published content, excluded fields, actions per content type (rows set in the config are read-only)                                           |
| Roles          | Whether each Users & Permissions role may connect. What a role receives follows its permissions.                                                   |
| Live presence  | Show who is editing, show typing                                                                                                                   |
| Monitoring     | Log connections, keep an in-memory event log, event log size                                                                                       |

**Monitoring** (`plugin::io.monitoring.read`; reset and test events need `plugin::io.monitoring.manage`): connected clients by type, active rooms, events per second, events sent, admins online with the entries they edit, and the event log. Test events go to every connected client; names used by content and presence events are refused.

![Settings > Socket.IO > Monitoring](./pics/monitoringSettings.png)

**Homepage widgets** (Strapi 5.13+): _Socket.IO_ (four counters) and _Admins online_. Both need `plugin::io.monitoring.read`.

![Socket.IO homepage widget](./pics/widget.png)

**Live presence panel** in the Content Manager edit view: shows the other admins editing the same entry and, optionally, which field they are typing in. Admins only join the presence room of content types they may read in the Content Manager. The panel connects with a one-time token per connection attempt and shows no email addresses.

![Live presence panel in the edit view](./pics/livepresenceindi.png)

Screenshots come from a local test host with synthetic data.

Strapi grants new permissions to Super Admins only. Give other roles access in _Settings > Administration Panel > Roles > Plugins > IO_.

## Server API

```js
// Content events (also used internally)
await strapi.$io.emit({ event: 'publish', schema: 'api::article.article', data: entry });
await strapi.$io.emitIdentifier({ event: 'delete', schema: 'api::article.article', data: { documentId, locale } });

// Custom events (sensitive fields removed). Without rooms they go to every client.
await strapi.$io.raw({ event: 'maintenance', data: { at: '22:00' }, rooms: ['io-role-authenticated'] });

// Helpers
strapi.$io.joinRoom(socketId, 'premium'); // plugin rooms (io-role-, io-token-, io-admin-, presence:) are refused
strapi.$io.leaveRoom(socketId, 'premium');
await strapi.$io.getSocketsInRoom('premium');
strapi.$io.sendPrivateMessage(socketId, 'notice', data);
strapi.$io.broadcast(socketId, 'notice', data); // everyone except socketId
strapi.$io.emitToNamespace('chat', 'notice', data);
strapi.$io.disconnectSocket(socketId);
await strapi.$io.revalidateSockets();

strapi.$io.server; // the Socket.IO Server
strapi.$io.namespaces; // { '': Namespace, chat: Namespace, ... }

// Monitoring service (counts only)
const monitoring = strapi.plugin('io').service('monitoring');
await monitoring.getConnectionStats(); // { connected, rooms, byKind: { admin, user, token, public } }
monitoring.getEventStats(); // { totalEvents, eventsPerSecond, lastEventAt, totalConnections, since }
monitoring.getEventLog(50);
```

Namespaces created with `strapi.$io.server.of('/name')`, for example in `hooks.init`, use the same handshake as the default namespace. TypeScript types ship with the package (`types.d.ts`) and add `strapi.$io` to `Core.Strapi`.

## Security model

- Admin routes require an authenticated admin plus the plugin permission (`admin::hasPermissions`). The presence session route only requires an authenticated admin.
- Monitoring responses contain counts and admin display names only, never IP addresses, emails, tokens or socket ids.
- The settings document is validated with a strict schema (unknown keys rejected, every list and number bounded). Invalid input returns `400` with field paths.
- Presence events are accepted only from admin sockets and are rate limited.
- Clients can be rate limited per socket; the connection count, IP rules and origins are checked in the handshake.
- Logs never contain tokens, emails or IP addresses.

Report vulnerabilities privately through GitHub security advisories.

## Scaling with Redis

To run several Strapi instances behind a load balancer, use the official Redis adapter. Install `@socket.io/redis-adapter` and `redis` in your project and attach the adapter in `hooks.init`:

```js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
      hooks: {
        async init({ strapi, $io }) {
          const pubClient = createClient({ url: env('REDIS_URL') });
          const subClient = pubClient.duplicate();
          await Promise.all([pubClient.connect(), subClient.connect()]);
          $io.server.adapter(createAdapter(pubClient, subClient));
          strapi.log.info('[io] Redis adapter ready');
        },
      },
    },
  },
});
```

Keep the Redis URL in an environment variable. The admin panel does not store it.

## Upgrading from 5.x

6.0 contains breaking changes. The full list is in [CHANGELOG.md](./CHANGELOG.md). In short:

1. **Delivery follows read permissions.** Give roles and tokens `find` (or `findOne`) on the content types they should receive. Create or update permissions alone no longer deliver events.
2. **Publish is its own event.** Publishing used to emit `:delete` and `:create`; it now emits `:publish`. Unpublish and discard draft emit `:unpublish` and `:discardDraft`. If you limit `actions` in the config, add the new ones you need.
3. **Drafts are not sent by default.** Turn off _Only published content_ to send drafts.
4. **Delete events go to readers only** and include `locale` for localized content.
5. **Rooms:** API-token rooms are `io-token-<id>`; custom role rooms are `io-role-<role type>` (`io-role-public` and `io-role-authenticated` are unchanged).
6. **Settings are enforced.** Settings stored by 5.x were never applied. On the first start, unused keys (Redis, namespaces, entity subscriptions, live preview, field-level changes) are dropped, and the old default origin `http://localhost:3000` and the old default connection limit of 1000 are reset. Review _Settings > Socket.IO_ after upgrading.
7. **Admin permissions.** Only Super Admins can open the plugin pages until you grant the new permissions to other roles.
8. **Removed:** the `security` service, the scaffold route `GET /api/io`, settings export and import, and the entity subscription API, which was never part of the published 5.4 to 5.8 builds.
9. **Message size.** `maxHttpBufferSize` defaults to 100 KB. Raise it in `socket.serverOptions` if clients send larger messages.

## Troubleshooting

**`strapi transfer` fails with 504 or 524 behind a proxy (#112).** Socket.IO's upgrade listener stopped Node from passing the Data Transfer WebSocket to Strapi. The plugin now forwards every upgrade outside the Socket.IO path back to Strapi. If you attach your own `upgrade` listener, the plugin leaves those upgrades to you.

**`strapi ts:generate-types` or shutdown hangs (#109).** The plugin no longer closes Strapi's HTTP server, and all its timers are released on destroy.

**Clients receive nothing.** Check that the role or token has `find` on the content type, that the content type is watched (config or settings) and, for Draft & Publish, that you listen to `:publish` or turned off _Only published content_.

**Browser connection fails with a CORS or 400 error.** Add the frontend origin under _Allowed origins_, or set `socket.serverOptions.cors`.

## Development

```bash
npm ci
npm run lint          # ESLint 10 flat config
npm run format:check  # Prettier
npm run build         # @strapi/sdk-plugin
npm test              # node --test
npm run test:types    # checks types.d.ts with tsc
npm run verify
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). semantic-release publishes releases from `main`.

## License

[MIT](./LICENSE)
