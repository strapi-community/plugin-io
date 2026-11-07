---
description: Every option of the Strapi Socket.IO plugin - contentTypes, events, hooks, socket.serverOptions, sensitiveFields - plus the admin settings and their defaults.
---

# Plugin configuration

The plugin reads `config/plugins.js` (or `.ts`) once at startup. Everything an
editor may change at runtime lives in the admin settings instead, see
[Admin settings](#admin-settings).

```js
// config/plugins.js
module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
      sensitiveFields: [],
      events: [],
      hooks: {},
      socket: { serverOptions: {} },
    },
  },
});
```

The config is validated at startup. An unknown shape (for example a handler
that is not a function) stops Strapi with a validation error.

## Options

| Option                 | Type                                       | Default | Description                                                                                    |
| ---------------------- | ------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------- |
| `contentTypes`         | `Array<string \| ContentTypeConfig>`       | `[]`    | Content types whose changes are sent. More can be added in the admin settings.                 |
| `sensitiveFields`      | `string[]`                                 | `[]`    | Extra field names that are never sent, on top of the built-in list.                            |
| `events`               | `Array<{ name, handler, admin? }>`         | `[]`    | Handlers for events your clients send. See [Custom events](/examples/events).                  |
| `hooks.init`           | `({ strapi, $io, io }) => void \| Promise` | none    | Runs once during bootstrap, before the handshake. See [Hooks](/examples/hooks).                |
| `socket.serverOptions` | Socket.IO `ServerOptions`                  | `{}`    | Passed to `new Server()`. Values set here win over the plugin defaults and the admin settings. |

## `contentTypes`

A string watches every action. An object narrows the actions or adds
relations.

```js
contentTypes: [
  'api::article.article',
  { uid: 'api::page.page', actions: ['publish', 'unpublish', 'delete'] },
  { uid: 'api::product.product', populate: ['category', 'images'] },
],
```

| Key        | Type                                                                                    | Default  | Description                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uid`      | `string`                                                                                | required | Content type uid, e.g. `api::article.article`.                                                                                                                                  |
| `actions`  | `Array<'create' \| 'update' \| 'delete' \| 'publish' \| 'unpublish' \| 'discardDraft'>` | all six  | Actions that send an event.                                                                                                                                                     |
| `populate` | `'*' \| true \| string[] \| object`                                                     | none     | Relations to load before `create`, `update`, `publish` and `discardDraft` are sent. `'*'` and `true` load one level of every relation. An object uses Strapi's populate syntax. |

Events are named `<singularName>:<action>`, for example `article:publish`.
Content types set here appear as read-only rows in the admin settings.

### Payloads

| Action                                        | Payload                                  |
| --------------------------------------------- | ---------------------------------------- |
| `create`, `update`, `publish`, `discardDraft` | `{ data: { id, attributes }, meta: {} }` |
| `unpublish`, `delete`                         | `{ data: { documentId, locale? } }`      |

Each role and API token receives the entry sanitized with its own Content API
permissions. Populated relations it cannot read are removed. Keep `populate`
small: every relation is loaded once per event and sanitized once per
listening role or token.

## `sensitiveFields`

Field names removed from every content event and from `strapi.$io.raw()`
payloads, at any depth. The built-in list already covers `password`,
`resetPasswordToken`, `confirmationToken`, `apiKey`, `secret` and similar keys,
as well as fields marked `private` in the schema.

```js
sensitiveFields: ['internalNotes', 'costPrice'],
```

Editors can add more under _Settings > Socket.IO > Content events > Excluded fields_.

## `events`

```js
events: [
  { name: 'connection', handler: ({ strapi }, socket) => strapi.log.debug(`[io] ${socket.id} connected`) },
  { name: 'ping', handler: (_ctx, socket, ...args) => args.at(-1)?.('pong') },
],
```

| Key       | Type                                           | Description                                               |
| --------- | ---------------------------------------------- | --------------------------------------------------------- |
| `name`    | `string`                                       | Client event name. `connection` runs once per new socket. |
| `handler` | `({ strapi, io }, socket, ...args) => unknown` | `io` is `strapi.$io`. Errors are caught and logged.       |
| `admin`   | `boolean`                                      | Also run on admin presence sockets. Default `false`.      |

Check `socket.data.kind` (`public`, `user`, `token` or `admin`) before you use
an id. Full guide: [Custom events](/examples/events).

## `hooks.init`

```js
hooks: {
  async init({ strapi, $io }) {
    $io.server.use((socket, next) => next());
  },
},
```

- Awaited during bootstrap. The HTTP server is not listening yet.
- Middleware added with `$io.server.use()` runs before the plugin handshake.
- `$io` and `io` are the same object (`io` is kept for configs written for older versions).
- An error is logged as `[io] hooks.init failed` and Strapi keeps starting.

Full guide with the Redis adapter: [Hooks](/examples/hooks).

## `socket.serverOptions`

Passed to Socket.IO's [`new Server(httpServer, options)`](https://socket.io/docs/v4/server-options/).
The plugin sets these defaults; anything you set wins.

| Option                                          | Plugin default          | Why                                                                                                     |
| ----------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `destroyUpgrade`                                | `false`                 | Other WebSocket upgrades on Strapi's server (Data Transfer) are left to Strapi instead of being closed. |
| `maxHttpBufferSize`                             | `1e5` (100 KB)          | Caps the size of a client message. Socket.IO's own default is 1 MB.                                     |
| `cors`                                          | from _Allowed origins_  | CORS headers for listed origins only.                                                                   |
| `allowRequest`                                  | from _Allowed origins_  | Refuses polling and WebSocket requests from browser origins that are not allowed.                       |
| `pingInterval`, `pingTimeout`, `connectTimeout` | from the admin settings | Applied to new connections without a restart.                                                           |

Setting `cors` or `allowRequest` yourself turns off the admin setting
_Allowed origins_ for that option.

```js
socket: {
  serverOptions: {
    path: '/realtime', // clients then connect with io(url, { path: '/realtime' })
    maxHttpBufferSize: 1e6,
  },
},
```

## Admin settings

_Settings > Socket.IO > Settings_. Changes apply to new connections without a
restart. Stored in Strapi's plugin store and validated with a strict schema.

| Setting                      | Default              | Description                                                                                                                                                                                                               |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowed origins              | none                 | Browser origins that may connect. With an empty list only the Strapi host itself and the origins of `server.url` / `admin.url` are allowed. Clients without an `Origin` header (servers, mobile apps) are always allowed. |
| Maximum connections          | `0` (no limit)       | Refuses new connections above this number.                                                                                                                                                                                |
| Ping interval / timeout      | `25000` / `20000` ms | Socket.IO heartbeat.                                                                                                                                                                                                      |
| Connection timeout           | `45000` ms           | Time a client has to finish the handshake.                                                                                                                                                                                |
| Require authentication       | off                  | Refuse clients without a JWT or API token.                                                                                                                                                                                |
| Limit client events          | off, `10`/s          | Per-client event limit.                                                                                                                                                                                                   |
| Allowed / blocked IPs        | none                 | IPv4/IPv6 addresses and CIDR blocks. The client IP follows Strapi's `server.proxy` settings.                                                                                                                              |
| Only published content       | on                   | Do not send draft versions.                                                                                                                                                                                               |
| Excluded fields              | none                 | Field names never sent.                                                                                                                                                                                                   |
| Content types and actions    | none                 | Watch more API content types without a deploy.                                                                                                                                                                            |
| Roles: allow connection      | all allowed          | Refuse sockets of a Users & Permissions role. What a role receives follows its permissions.                                                                                                                               |
| Entry subscriptions, limit   | off, `100`           | Let clients follow single entries with `subscribe-entity` (1 to 1,000 per client). Needs read permission of the client's role or token.                                                                                   |
| Show who is editing / typing | on / on              | Live presence in the Content Manager.                                                                                                                                                                                     |
| Log connections              | off                  | Info log line per connect and disconnect (no IPs or tokens).                                                                                                                                                              |
| Event log, size              | off, `100`           | In-memory list of recent events for _Monitoring_.                                                                                                                                                                         |

The section _Export and import_ downloads the saved settings as JSON (no
secrets) and imports such a file: the server checks it with the same schema
(`POST /io/settings/validate`, needs _Update settings_), the changed values
are listed for confirmation and fill the form, and nothing is stored until
_Save_.

## Environment variables

The plugin reads none itself. Use Strapi's `env()` helper in your config:

```js
module.exports = ({ env }) => ({
  io: {
    enabled: env.bool('IO_ENABLED', true),
    config: {
      contentTypes: ['api::article.article'],
      socket: { serverOptions: { path: env('IO_PATH', '/socket.io') } },
    },
  },
});
```

## See also

- [IO class](/api/io-class): `strapi.$io` methods
- [Custom events](/examples/events) and [Hooks](/examples/hooks)
- [Socket.IO server options](https://socket.io/docs/v4/server-options/)
