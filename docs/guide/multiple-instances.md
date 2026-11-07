---
description: Run the Strapi Socket.IO plugin on several processes, for example Railway replicas and a pm2 cluster, with the Postgres or Redis adapter, WebSocket-only transport, proxy settings and connection pool sizing.
---

# Running several instances

A Strapi app often runs as more than one Node.js process: replicas on Railway,
Render or Kubernetes, a pm2 cluster, or both. Example: two Railway replicas with
`pm2 -i 4` each are eight processes that share one PostgreSQL database and no
memory.

Socket.IO keeps its clients in the memory of the process they connected to. For
eight processes to act as one server, the plugin needs three things from you:

1. a **multi-server adapter**, so an event emitted on one process reaches clients
   on the other seven;
2. **WebSocket-only transport**, because neither Railway nor pm2 provides sticky
   sessions;
3. the **proxy setting**, so client IPs are real IPs.

Everything else is shared through the database automatically.

## Quick setup (PostgreSQL, no Redis)

```bash
npm install @socket.io/postgres-adapter pg
```

```js
// config/plugins.js
module.exports = () => ({
  io: {
    enabled: true,
    config: {
      contentTypes: ['api::article.article'],
      socket: {
        adapter: 'postgres', // uses Strapi's own PostgreSQL connection
        websocketOnly: true, // no long-polling, so no sticky sessions needed
      },
    },
  },
});
```

```js
// config/server.js (Railway)
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  proxy: { koa: true, ipHeader: 'X-Real-IP', maxIpsCount: 1 },
  app: { keys: env.array('APP_KEYS') },
});
```

Clients connect with WebSocket only:

```js
import { io } from 'socket.io-client';

const socket = io('https://cms.example.com', {
  transports: ['websocket'],
  auth: { strategy: 'jwt', token: userJwt },
});
```

The Strapi admin (live presence) already connects with WebSocket only.

## What the plugin shares between processes

Coordination switches on by itself when a multi-server adapter is attached, when
the process is a pm2 cluster worker (`cluster.isWorker`) or when it runs on
Railway (`RAILWAY_REPLICA_ID`). A single plain process keeps everything in
memory, as before, and writes nothing extra.

| What                              | How it is shared                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Content events, `raw()`, typing   | The Socket.IO adapter.                                                                                                   |
| Admin presence tokens             | Table `plugin_io_presence_tokens` (SHA-256 hashes only). A token issued on one process works exactly once on any other.  |
| Editors on an entry               | `fetchSockets()` through the adapter, so editors on different processes see each other.                                  |
| Settings                          | A revision in the stored settings. Saves are compare-and-swap; a stale save gets `409` and the admin offers a reload.    |
| Revocations (user, token, admin)  | A control signal over the adapter (`serverSideEmit`) and table `plugin_io_signals`, polled every 3 s as fallback.        |
| Audience cache                    | Same control signal; the 10-second cache stays as the upper bound.                                                       |
| Failed-handshake lockout          | Table `plugin_io_counters` (hashed IPs). 20 failures per minute across all processes; a block is announced to all.       |
| Connection cap (`maxConnections`) | A total over all processes, from their heartbeats (10 s), re-read at most every poll interval (3 s).                     |
| Monitoring                        | Each process writes its counters to `plugin_io_nodes`; the page shows the sum. The event log is merged over the adapter. |

The four `plugin_io_*` tables are created on first start with portable knex
calls (PostgreSQL, MySQL, SQLite). Strapi's schema sync leaves them alone.

Settings: `config.cluster` tunes the coordination.

```js
cluster: {
  enabled: 'auto', // or true / false
  pollInterval: 3000, // ms between signal reads
  heartbeatInterval: 10000, // ms between heartbeats
},
```

## Choosing an adapter

| Adapter             | Install                              | Use when                                                                  |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `'postgres'`        | `@socket.io/postgres-adapter` `pg`   | You already use PostgreSQL. No extra service. Uses `LISTEN`/`NOTIFY`.     |
| `{ type: 'redis' }` | `@socket.io/redis-adapter` `ioredis` | You have Redis (for example Railway Redis). Lower latency at high volume. |
| a function          | any                                  | Any other adapter or your own client setup.                               |

### PostgreSQL

```js
socket: {
  adapter: {
    type: 'postgres',
    // connectionString: process.env.SOCKET_DATABASE_URL, // default: Strapi's connection
    poolMax: 2, // the adapter's own pool: one LISTEN connection plus NOTIFY
  },
  websocketOnly: true,
},
```

- The adapter keeps one connection in `LISTEN` mode, so it needs a direct or
  session-mode connection. It does **not** work through a PgBouncer pool in
  transaction mode. On Railway the internal `DATABASE_URL` is direct.
- Messages larger than 8000 bytes go through the table `socket_io_attachments`,
  which the plugin creates and the adapter cleans up every 30 s.
- If the adapter loses its connection (database restart, failover,
  `idle_session_timeout`), events reach only local clients until it reconnects
  ([Socket.IO docs](https://socket.io/docs/v4/postgres-adapter/)). The adapter
  retries after 1 to 3 s. The plugin logs the error once a minute, keeps the
  process running and frees the dead connection's pool slot, so delivery
  resumes after the reconnect. Settings, revocations and lockouts still travel
  through the signal table while the adapter is down.

### Redis

```js
socket: {
  adapter: { type: 'redis', url: process.env.REDIS_URL },
  websocketOnly: true,
},
```

The plugin uses `ioredis`, which the Socket.IO documentation recommends because
the `redis` package "seems to have problems restoring the Redis subscriptions
after reconnection" ([Socket.IO docs](https://socket.io/docs/v4/redis-adapter/)).

### Custom

Return the adapter, or `{ adapter, close }` when the plugin should close your
connections on shutdown. This example uses the `redis` package the way the
Socket.IO documentation shows it:

```js
socket: {
  adapter: async () => {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const { createClient } = require('redis');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    return {
      adapter: createAdapter(pubClient, subClient),
      close: () => Promise.all([pubClient.quit(), subClient.quit()]),
    };
  },
},
```

Attaching an adapter yourself in `hooks.init` still works; the plugin detects it.

## Transports and sticky sessions

HTTP long-polling sends several requests per connection, and they must all reach
the same process. Railway "does not support sticky sessions" and spreads requests
randomly ([Railway docs](https://docs.railway.com/deployments/scaling)); pm2
cluster mode does not keep them either. With polling enabled, clients loop on
`Session ID unknown` (HTTP 400).

With WebSocket only, one TCP connection carries everything and sticky sessions
are not needed ([Socket.IO docs](https://socket.io/docs/v4/using-multiple-nodes/)).
`socket.websocketOnly: true` sets the server's `transports` to `['websocket']`
(an explicit `socket.serverOptions.transports` wins). Clients must also use
`transports: ['websocket']`. Trade-off: clients behind proxies that block
WebSocket cannot fall back to polling.

The plugin logs a warning at boot when polling is enabled with several
processes.

## Behind the Railway proxy

Railway's edge passes the client address in `X-Real-IP`. Without
`server.proxy.koa: true` every client appears with the proxy's address, so one
client's failed handshakes lock out everyone and IP rules apply to the proxy.

```js
// config/server.js
proxy: { koa: true, ipHeader: 'X-Real-IP', maxIpsCount: 1 },
```

`ipHeader` and `maxIpsCount` exist since Strapi 5.52. Strapi's docs ask for
`maxIpsCount` with every reverse proxy; Railway sends one address in `X-Real-IP`,
so `1` fits ([Strapi server configuration](https://docs.strapi.io/cms/configurations/server)).

The plugin reads the client IP exactly like Strapi (`server.proxy.koa`,
`ipHeader`, `maxIpsCount`) and warns at boot when it runs on Railway without
proxy trust. pm2 cluster workers share the listening socket of the pm2 master,
so pm2 adds no extra hop.

## pm2

```js
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'strapi',
      script: 'npm',
      args: 'start',
      instances: 4,
      exec_mode: 'cluster',
    },
  ],
};
```

### Restarts and rolling deploys

When a process stops (`pm2 reload`, a Railway deploy, scaling down), the plugin
closes only that process's connections. Clients see `transport close` and
socket.io-client reconnects by itself, through the balancer, to a running
process; clients of the other processes stay connected. Admin presence fetches a
new one-time token for the reconnect.

With several hosts, each running a pm2 cluster, `@socket.io/pm2` is not enough:
the Socket.IO docs point to "another adapter" for that case
([Socket.IO docs](https://socket.io/docs/v4/pm2/)). Use the Postgres or Redis
adapter above.

## Database connection budget

Every process opens its own knex pool, plus the adapter pool with
`adapter: 'postgres'`. Check the total against the server's `max_connections`
(PostgreSQL's default is 100; check your plan):

| Setup                   | Strapi pool (`database.connection.pool.max`) | Adapter pool | Total |
| ----------------------- | -------------------------------------------- | ------------ | ----- |
| 2 replicas × pm2 4 = 8  | 10 (Strapi default)                          | 2            | 96    |
| 2 replicas × pm2 4 = 8  | 6                                            | 2            | 64    |
| 3 replicas × pm2 4 = 12 | 5                                            | 2            | 84    |

Leave room for migrations, backups and admin tools. With Redis the adapter pool
column is zero.

```js
// config/database.js
connection: {
  client: 'postgres',
  connection: { connectionString: env('DATABASE_URL') },
  pool: { min: 0, max: env.int('DATABASE_POOL_MAX', 6) },
},
```

## Limits that remain

- Without an adapter, events and presence stay per process. The plugin warns at
  boot (pm2 cluster) and as soon as a second process writes its heartbeat
  (replicas), and the Monitoring page shows the warning.
- Revocations arrive within the poll interval (3 s by default) when the adapter
  is down; the periodic five-minute re-check stays as the last line.
- The failed-handshake lockout may let through one extra attempt per other
  process while the failures are counted. Once an IP is blocked, the block is
  announced to every process (over the adapter, or within the poll interval).
- `maxConnections` uses the other processes' last heartbeat, so a burst of new
  connections within one heartbeat interval (10 s) can exceed the cap by what
  arrived on the other processes in that time.
- Monitoring totals from other processes are at most one heartbeat old.
- With entity subscriptions on, every change is sanitized for each reading
  audience, because a process cannot see which entries are followed elsewhere
  (the Postgres adapter has no cross-server room list).
- `joinRoom()`, `leaveRoom()`, `disconnectSocket()`, `unsubscribeFromEntity()`
  and `getEntitySubscriptions()` return a Promise for a socket on another
  process; always `await` them. They look the id up first and act only on the
  socket with exactly that id, never on a room of that name.
- Parallel `subscribeToEntity()` calls for one socket made on several processes
  at the same moment can exceed `maxPerSocket` by the number of those processes
  minus one. Calls made on one process are capped exactly.
- The signal table is read by id. A signal whose id was taken before another's
  but committed after it is still delivered: skipped ids are asked for again
  for 30 s (at least five poll intervals).
