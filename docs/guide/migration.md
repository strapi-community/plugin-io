---
description: Upgrade the Strapi Socket.IO plugin from 5.x to 6.0 - read-permission delivery, publish events, drafts, rooms, admin sockets, hooks order, origins and removed APIs.
---

# Migration guide

## Compatibility

| Plugin | Strapi        | Node.js                | Status   |
| ------ | ------------- | ---------------------- | -------- |
| 6.x    | 5.13 or later | 22 or 24 (`>=22 <=26`) | Current  |
| 5.x    | 5.x           | 18 to 22               | Previous |
| 2.x    | 4.x           | 14 to 20               | Legacy   |

Node.js 22.21 or 24.9 (or newer) is recommended: on these versions the plugin
leaves every non-Socket.IO request, including upgrade requests with a body,
to Strapi exactly as Node would without the plugin.

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

- Stored 5.x settings are migrated on the first start and are now enforced. Keys that were never implemented (Redis, namespaces, entity subscriptions, live preview, field-level changes) are dropped. The old default origin `http://localhost:3000` and the old default limit of 1000 connections are reset.
- Only Super Admins see the plugin pages until you grant `Read settings`, `Update settings`, `Read monitoring` and `Reset statistics and send test events` under _Settings > Administration panel > Roles > Plugins > IO_.

### 11. Removed

| Removed                         | Replacement                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `security` service              | The settings _Allowed/blocked IPs_, _Limit client events_, _Maximum connections_ |
| Settings export and import      | Copy the settings by hand or with Strapi's data transfer                         |
| Redis toggle in the settings    | Attach `@socket.io/redis-adapter` in `hooks.init`                                |
| Entity subscription helpers     | Content events by role or token, or your own rooms                               |
| Live preview, field-level diffs | None                                                                             |
| `GET /api/io`                   | None (it answered 500)                                                           |

### 12. Smaller changes

- `maxHttpBufferSize` defaults to 100 KB. Raise it in `socket.serverOptions` if clients send larger messages.
- The `POST /io/presence/session` admin route keeps at most five unused tokens per admin and answers `429` when 10,000 are pending server-wide.
- _Monitoring > Admins online_ and the _Admins online_ widget list only entries in content types the viewer may read; the rest are counted as "entries you cannot view".

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
