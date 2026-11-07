---
description: Upgrade the Strapi Socket.IO plugin from 5.x to 6.0 - read-permission delivery, publish events, drafts, rooms, admin sockets, hooks order, origins and removed APIs.
---

# Migration guide

## Compatibility

| Plugin | Strapi        | Node.js                   | Status   |
| ------ | ------------- | ------------------------- | -------- |
| 6.x    | 5.38 or later | 22.21+ or 24.9+ (to 26.x) | Current  |
| 5.x    | 5.x           | 18 to 22                  | Previous |
| 2.x    | 4.x           | 14 to 20                  | Legacy   |

6.x needs Node.js 22.21 or 24.9 (or newer): the plugin uses the HTTP
server's `shouldUpgradeCallback`, added in those releases, to leave every
non-Socket.IO request, including upgrade requests with a body, to Strapi
exactly as Node would without the plugin.

6.x needs Strapi 5.38 or later. The admin is built with Strapi Design
System 2.2, and Strapi ships that version with its admin from 5.38.0 on
(5.37 ships 2.1). Upgrade Strapi first if your project is older.

## 5.x to 6.0

6.0 makes delivery follow Strapi's read permissions and enforces the admin
settings. Work through the list below after upgrading.

### 1. Read permission decides delivery

Roles and API tokens receive events for content types they may `find` or
`findOne`. Create or update permissions alone no longer deliver anything.

**Do:** in _Settings > Users & Permissions > Roles_ (and for custom API
tokens), grant `find` on every content type a client should receive.

### 2. Publish has its own events

Publishing used to emit `:delete` followed by `:create`. It now emits
`:publish`. Unpublish and discard draft emit `:unpublish` and `:discardDraft`.

```js
// before
socket.on('article:create', add);
socket.on('article:delete', remove);

// after
socket.on('article:publish', add);
socket.on('article:unpublish', ({ data }) => remove(data.documentId));
socket.on('article:delete', ({ data }) => remove(data.documentId));
```

If `config.contentTypes[].actions` lists actions, add the new ones you need.

### 3. Drafts are not sent by default

With Draft & Publish, only published versions are sent. Turn off
_Only published content_ in the settings to also send drafts to the roles
that may read them.

### 4. Delete events go to readers only

`:delete` and `:unpublish` are sent only to roles and tokens that may read the
content type, as `{ data: { documentId, locale? } }`, one event per locale.

### 5. Room names

| Room                   | 5.x                                       | 6.0                   |
| ---------------------- | ----------------------------------------- | --------------------- |
| Public / Authenticated | `io-role-public`, `io-role-authenticated` | unchanged             |
| Custom role            | `io-role-<role name in lower case>`       | `io-role-<role type>` |
| API token              | `io-token-<token name in lower case>`     | `io-token-<token id>` |

Names are now stable when a role or token is renamed, and two tokens with the
same name no longer share a room.

### 6. `socket.data` for your handlers

The handshake fills `socket.data`. Check `socket.data.kind` before you use an id:

| `kind`   | Keys                                            |
| -------- | ----------------------------------------------- |
| `user`   | `user.id`, `user.role`, `role`, `expiresAt`     |
| `token`  | `token.id`, `token.type`, `expiresAt`           |
| `public` | `role`                                          |
| `admin`  | `admin.id`, `admin.firstname`, `admin.lastname` |

Admin presence sockets (from the Content Manager) keep their identity under
`socket.data.admin`, never under `socket.data.user`, and your `config.events`
handlers do not run on them unless the event sets `admin: true`. Keys that
older docs mentioned, such as `socket.data.userId` or
`socket.data.user.username`, were never set by the plugin.

### 7. `hooks.init`

- The context is `{ strapi, $io, io }`; `$io` and `io` are the same object, so both old and new examples work.
- `init` runs **before** the plugin handshake is added, as in 5.x. Middleware from `$io.server.use()` therefore runs before authentication, and `socket.data.kind` is not set yet inside it. Use a `connection` handler in `config.events` for logic that needs the authenticated client.
- Do not overwrite `socket.data.user` or `socket.data.kind` in middleware; the handshake sets them afterwards.

### 8. Allowed origins are enforced for WebSocket too

With an empty _Allowed origins_ list, browsers may only connect from the
Strapi host itself or from the origins of `server.url` / `admin.url`. 5.x
accepted WebSocket connections from any origin. Clients without an `Origin`
header (Node, mobile apps) are not affected.

**Do:** add every frontend origin, for example `https://app.example.com`,
under _Settings > Socket.IO > Allowed origins_.

### 9. Sockets end with their session

- User sockets are disconnected when the JWT expires, the user is blocked or changes role, and (refresh mode) when the Strapi session behind the access token is revoked or the user logs out.
- API-token sockets end when the token is deleted or expires.
- Admin presence sockets end when the admin logs out, the admin session expires, the account is deactivated, or the admin loses read access to an entry the panel has open.

### 10. Settings and permissions

- Stored 5.x settings are migrated on the first start and are now enforced. Keys that were never implemented (Redis, namespaces, live preview, field-level changes) are dropped. The 5.x entity subscription limit is kept, but entity subscriptions stay off until you turn them on. The old default origin `http://localhost:3000` and the old default limit of 1000 connections are reset.
- Only Super Admins see the plugin pages until you grant `Read settings`, `Update settings`, `Read monitoring` and `Reset statistics and send test events` under _Settings > Administration panel > Roles > Plugins > IO_.

### 11. Restored, changed and removed

**Entity subscriptions** are back, now with Strapi permissions:

- Turn them on under _Settings > Socket.IO > Entry subscriptions_. They are off by default.
- Clients send `subscribe-entity` with `{ uid, documentId }`. `{ uid, id }` still works, but `id` must be the `documentId`; numeric ids are refused.
- A subscription needs `find` or `findOne` for the content type on the client's own role or API token, and the entry must exist (published, while _Only published content_ is on).
- Subscribers receive events of content types and actions that are not broadcast under _Events_. Each event is sanitized with the subscriber's role or token permissions, and read permission is checked again on every event.
- Server helpers: `strapi.$io.subscribeToEntity()`, `unsubscribeFromEntity()`, `getEntitySubscriptions()`. `emitToEntity` and `getEntityRoomSockets` are not part of 6.0.

**Settings export and import** are back on the settings page. The file is the
settings JSON (no secrets). Import checks it on the server, shows the changed
values, fills the form, and nothing is stored until _Save_.

| Removed                      | Replacement and reason                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security` service           | The settings _Allowed/blocked IPs_, _Limit client events_, _Maximum connections_                                                                                                                                                                                                                                                                                                                                                      |
| Redis toggle in the settings | `socket.adapter: { type: 'redis' }` in the plugin config (an adapter attached in `hooks.init` keeps working); see [Several instances](./multiple-instances)                                                                                                                                                                                                                                                                           |
| Live preview events          | Not restored. 5.x relayed unsaved field values from the editor to clients. Unsaved values never pass through the Document Service, so Strapi's Content API sanitizer cannot check them per role or token, and a private field would reach clients that may not read it. Use Strapi's [Preview](https://docs.strapi.io/cms/features/preview), or turn off _Only published content_ and subscribe to the entry to receive saved drafts. |
| Field-level diffs            | Not restored. A diff needs the previous version of every updated entry (one extra query per update) and has to be computed on each audience's sanitized data, or changed field names would reveal private fields. Compare the entry you receive with the one you have on the client.                                                                                                                                                  |
| `GET /api/io`                | None (it answered 500)                                                                                                                                                                                                                                                                                                                                                                                                                |

### 12. Smaller changes

- Node.js 22.0 to 22.20 and 23 are no longer supported. The 400 answer that older Node.js versions gave upgrade requests with a body is gone with them.
- `maxHttpBufferSize` defaults to 100 KB. Raise it in `socket.serverOptions` if clients send larger messages.
- The `POST /io/presence/session` admin route keeps at most five unused tokens per admin and answers `429` when 10,000 are pending server-wide.
- _Monitoring > Admins online_ and the _Admins online_ widget list only entries in content types the viewer may read; the rest are counted as "entries you cannot view".

### 13. Several instances

5.x kept presence tokens, settings, the lockout and the connection count in
each process, so several replicas or a pm2 cluster disagreed with each other.
6.0 shares them through the database and the Socket.IO adapter:

- Set `socket.adapter` to `'postgres'` (install `@socket.io/postgres-adapter`
  and `pg`) or `{ type: 'redis' }` (install `@socket.io/redis-adapter` and
  `ioredis`). An adapter attached in `hooks.init` keeps working.
- Without sticky sessions, set `socket.websocketOnly: true` and use
  `transports: ['websocket']` in clients.
- On first start with coordination on, the plugin creates
  `plugin_io_presence_tokens`, `plugin_io_counters`, `plugin_io_nodes` and
  `plugin_io_signals`. The Postgres adapter opens two extra connections per
  process, so lower `database.connection.pool.max` if your database limits
  connections (8 processes x (6 + 2) stay under 100).
- Behind a proxy, set `server.proxy` (`koa: true`, `ipHeader`,
  `maxIpsCount: 1`) so the lockout counts the client IP, not the proxy.
- `joinRoom`, `leaveRoom`, `disconnectSocket` and the entity subscription
  helpers return a Promise for a socket on another process; `await` them.
  They act only on the socket with exactly the id you pass.
- `presence.createSessionToken()`, `consumeSessionToken()` and `size()`
  return Promises, and `monitoring.getConnectionStats()` returns the totals
  of all processes.

One plain process needs none of this: it keeps the in-memory behaviour,
creates no tables and starts no timers. The full setup is in
[Several instances](./multiple-instances).

## v2 (Strapi 4) to v5 (Strapi 5)

1. Upgrade Strapi itself first with the [official upgrade tool](https://docs.strapi.io/cms/upgrade-tool):
   `npx @strapi/upgrade major`.
2. Install the plugin version for Strapi 5: `npm install @strapi-community/plugin-io@latest`.
3. Keep `config/plugins.js`; the `contentTypes`, `events`, `hooks` and `socket` keys have the same shape.
4. Replace `strapi.entityService` calls in your event handlers with the [Document Service](https://docs.strapi.io/cms/api/document-service) (`strapi.documents(uid)`), which identifies entries by `documentId`.
5. Then follow the 5.x to 6.0 steps above.

## Getting help

Search or open an issue on [GitHub](https://github.com/strapi-community/plugin-io/issues).
Include your Strapi version, plugin version, Node.js version and the
smallest config that reproduces the problem.

## Dependency advisories (development tree)

`npm audit --omit=dev` is clean: the published package does not contain any
of the packages below. The repository's development tree overrides
`nodemailer` (^10.3.1), `zod` under `koa-body` (^4.6.7) and
`@hono/node-server` under `@modelcontextprotocol/node` (^2.1.6). These
remain, because no compatible patched release exists:

| Package (path)                                                                   | Advisory                                                      | Why it stays                                                                                                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zod` 3.25 in `koa-session` 7 (`@strapi/core`)                                   | GHSA-mrhx-c7xc-m3w5 (high)                                    | Fixed in zod 4.6.6, but koa-session uses `z.function().args()`, which zod 4 removed. Needs a Strapi release.                                                                                      |
| `stream-json` 1.9 (`@strapi/data-transfer`)                                      | GHSA-528h-pc64-c93x, GHSA-hqr4-qq8f-hg3x, GHSA-mjw6-4jj6-33hc | Fixed in 3.6; 3.x is a new major with a changed API. Needs a Strapi release.                                                                                                                      |
| `react-router` 6 (peer of the Strapi 5 admin)                                    | GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg                      | Fixed in 7.18; the Strapi 5 admin runs on react-router-dom 6.                                                                                                                                     |
| `minimatch` 9/10 and `glob` 13 (ESLint, nodemon, api-extractor, Strapi CLI, npm) | GHSA-g3hv-75wg-m249, GHSA-3g3m-2fjr-6pw4                      | Fixed in minimatch 11 / glob 14, which remove APIs (`makeRe`, `Minimatch#regexp`) that typedoc still calls; npm's bundled copies cannot be overridden. Build tooling only, with trusted patterns. |
| `deepmerge` 4.3.1                                                                | GHSA-gcqx-w48m-w2h4 (low)                                     | No patched release.                                                                                                                                                                               |

The other entries `npm audit` lists (`@strapi/*`, `eslint`, `semantic-release`,
`@semantic-release/*`, `@strapi/sdk-plugin`) are flagged only because they
depend on the packages above.
