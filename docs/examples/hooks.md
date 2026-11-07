---
description: Use hooks.init to attach the Redis adapter, add Socket.IO middleware, create namespaces and clean up on shutdown in the Strapi Socket.IO plugin.
---

# Hooks

`hooks.init` runs once during Strapi's bootstrap, before the server accepts
connections. Use it to attach an adapter, add middleware or create namespaces.

```js
// config/plugins.js
module.exports = ({ env }) => ({
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
      hooks: {
        async init({ strapi, $io }) {
          strapi.log.info(`[io] Socket.IO path: ${$io.server.path()}`);
        },
      },
    },
  },
});
```

## Signature

```ts
init(context: { strapi; $io; io }): void | Promise<void>
```

- `$io` and `io` are the same object: the plugin wrapper (`strapi.$io`). `$io.server` is the Socket.IO `Server`.
- The hook is awaited. If it throws, the error is logged as `[io] hooks.init failed` and Strapi keeps starting without whatever the hook would have set up, so check your logs after a deploy.
- **Order:** middleware you add here with `$io.server.use()` runs **before** the plugin's handshake (authentication, IP rules, origin and connection limits). At that point `socket.data.kind` is not set yet. To act on the authenticated client, use a `connection` handler in [`config.events`](/examples/events) instead.

## Redis adapter (several Strapi instances)

The simplest way is `socket.adapter: { type: 'redis' }` or `socket.adapter: 'postgres'`; see [Running several instances](/guide/multiple-instances). Attaching the adapter yourself in `hooks.init` keeps working and is detected by the plugin:

Behind a load balancer, every instance needs the same rooms. Install the
official adapter in your project:

```bash
npm install @socket.io/redis-adapter redis
```

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

Keep the URL in an environment variable. The admin settings do not store it.
Your load balancer also needs sticky sessions when clients may use HTTP
long-polling (see the [Socket.IO docs on multiple nodes](https://socket.io/docs/v4/using-multiple-nodes/)).

With a cluster adapter, content events are sanitized for every audience room,
because rooms on other instances are not visible locally. With the default
in-memory adapter, rooms without sockets are skipped.

## Middleware

Middleware added in `init` sees every handshake before the plugin does. Good
uses are request logging and cheap pre-checks. Do not overwrite
`socket.data.user`, `socket.data.admin` or `socket.data.kind`; the plugin's
handshake sets them right after your middleware.

### Log handshakes

```js
hooks: {
  init({ strapi, $io }) {
    $io.server.use((socket, next) => {
      strapi.log.debug(`[io] handshake via ${socket.conn.transport.name}`);
      next();
    });
  },
},
```

### Require a client version

```js
hooks: {
  init({ $io }) {
    $io.server.use((socket, next) => {
      const version = Number(socket.handshake.auth?.clientVersion ?? 0);
      if (version < 3) return next(new Error('Please update the app'));
      next();
    });
  },
},
```

The plugin already covers IP allow and block lists, a connection cap,
required authentication, origins and a per-client event limit. Configure them
in _Settings > Socket.IO_ instead of writing middleware for them.

## Namespaces

Namespaces you create with `$io.server.of()` get the plugin handshake
automatically, so `socket.data` is filled in the same way as on the default
namespace.

```js
hooks: {
  init({ $io }) {
    const chat = $io.server.of('/chat');
    chat.on('connection', (socket) => {
      if (socket.data.kind !== 'user') return socket.disconnect(true);
      socket.join(`chat-user-${socket.data.user.id}`);
    });
  },
},
```

Client:

```js
const chat = io('https://cms.example.com/chat', { auth: { strategy: 'jwt', token } });
```

Content events are only sent on the default namespace. Use
`strapi.$io.emitToNamespace('chat', 'event', data)` to send to a namespace.

## Join rooms for your own features

Use a `connection` handler, which runs after the handshake, to put clients in
your own rooms:

```js
events: [
  {
    name: 'connection',
    handler(_ctx, socket) {
      if (socket.data.kind === 'user') socket.join(`user-${socket.data.user.id}`);
    },
  },
],
```

Then notify one user from anywhere in Strapi:

```js
strapi.$io.server.to(`user-${userId}`).emit('notification', { text: 'Your export is ready' });
```

Room names starting with `io-role-`, `io-token-`, `io-admin-` or `presence:`
belong to the plugin. `strapi.$io.joinRoom()` refuses them.

## Clean up on shutdown

The plugin closes its own sockets, timers and adapters when Strapi stops. If
your hook opened connections (for example Redis clients), close them in your
app's `destroy` lifecycle:

```js
// src/index.js
let redisClients = [];

module.exports = {
  register() {},
  bootstrap() {},
  async destroy() {
    await Promise.allSettled(redisClients.map((client) => client.quit()));
  },
};
```

Fill `redisClients` from your hook, for example by exporting a small module
that both files require.

## Test a hook

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const { init } = require('../config/plugins.js')({ env: () => '' }).io.config.hooks;

test('init adds one middleware', async () => {
  const added = [];
  await init({ strapi: { log: { info() {}, debug() {} } }, $io: { server: { use: (fn) => added.push(fn) } } });
  assert.equal(added.length, 1);
});
```

## See also

- [Custom events](/examples/events)
- [Plugin configuration](/api/plugin-config)
- [Socket.IO middleware](https://socket.io/docs/v4/middlewares/)
