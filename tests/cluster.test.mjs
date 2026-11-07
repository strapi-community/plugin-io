import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import knexFactory from 'knex';
import { TABLES } from '../server/src/cluster/store.js';
import { nextEvent, startHost } from './helpers/socket-host.mjs';

/**
 * Several plugin "processes" in one Node process: each node has its own
 * HTTP server, Socket.IO server, knex pool and adapter pool, and they share
 * only PostgreSQL (and the core_store rows, which the stub keeps in one
 * array, like the shared `strapi_core_store_settings` table).
 *
 * Runs only with IO_TEST_PG_URL, for example
 * IO_TEST_PG_URL=postgres://strapi@127.0.0.1:5440/mi_io npm test
 */
const PG_URL = process.env.IO_TEST_PG_URL;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ack = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));
const READ = { action: 'plugin::content-manager.explorer.read' };

/**
 * Waits until `check` returns a truthy value.
 *
 * @param {() => any} check - Condition.
 * @param {number} [ms] - Timeout.
 * @returns {Promise<any>} The value.
 */
async function until(check, ms = 3000) {
  const end = Date.now() + ms;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > end) throw new Error('condition not met in time');
    await sleep(25);
  }
}

/**
 * Starts `count` nodes on one database.
 *
 * @param {number} count - Number of nodes.
 * @param {{ adapter?: boolean, settings?: object }} [options] - With or without the Postgres adapter.
 * @returns {Promise<{ nodes: any[], shared: object, close: () => Promise<void> }>} Cluster.
 */
async function startCluster(count, { adapter = true } = {}) {
  const admin = knexFactory({ client: 'pg', connection: PG_URL, pool: { min: 0, max: 2 } });
  for (const table of Object.values(TABLES)) {
    if (await admin.schema.hasTable(table)) await admin(table).del();
  }
  await admin.destroy();

  const shared = {
    coreStore: [],
    tokens: [
      {
        id: 7,
        type: 'read-only',
        name: 'synthetic',
        accessKey: 'hashed:tok-7',
        kind: 'content-api',
        expiresAt: null,
        lastUsedAt: new Date().toISOString(),
        permissions: [],
      },
    ],
    admins: [],
  };
  const tokenService = {
    hash: (value) => `hashed:${value}`,
    getBy: async ({ accessKey }) => shared.tokens.find((t) => t.accessKey === accessKey) ?? null,
  };
  const channelPrefix = `io_test_${randomBytes(4).toString('hex')}`;
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    const knex = knexFactory({ client: 'pg', connection: PG_URL, pool: { min: 0, max: 4 } });
    const host = await startHost({
      knex,
      dialect: 'postgres',
      coreStore: shared.coreStore,
      tokens: shared.tokens,
      admins: shared.admins,
      usersPermissions: { service: () => undefined },
      coreServices: { 'admin::api-token': tokenService },
      invalidation: true,
      config: {
        socket: {
          serverOptions: {},
          websocketOnly: true,
          ...(adapter
            ? {
                adapter: {
                  type: 'postgres',
                  connectionString: PG_URL,
                  channelPrefix,
                  // cleanupInterval left out on purpose: the adapter default must survive.
                  heartbeatInterval: 1000,
                },
              }
            : {}),
        },
        cluster: { enabled: true, pollInterval: 150, heartbeatInterval: 2000 },
      },
    });
    nodes.push({ ...host, knex });
  }
  // Postgres adapter nodes find each other through their first heartbeat.
  if (adapter) {
    await until(async () => (await nodes[0].strapi.$io.server.of('/').adapter.serverCount()) === count);
  }
  return {
    nodes,
    shared,
    channelPrefix,
    async close() {
      for (const node of nodes) await node.close();
      for (const node of nodes) await node.knex.destroy();
    },
  };
}

const adminSession = async (node, shared, user) => {
  if (!shared.admins.some((a) => a.id === user.id)) {
    shared.admins.push({ ...user, isActive: true, blocked: false, permissions: [READ] });
  }
  return (await node.strapi.plugin('io').service('presence').createSessionToken(user)).token;
};

if (!PG_URL) {
  test('multi-process cluster on PostgreSQL (set IO_TEST_PG_URL to run)', { skip: 'IO_TEST_PG_URL not set' }, () => {});
} else {
  test('IO-MP-01: an emit on one node reaches clients connected to every node', async () => {
    const cluster = await startCluster(4);
    const clients = [];
    for (const node of cluster.nodes) clients.push((await node.connect()).socket);
    const received = Promise.all(clients.map((socket) => nextEvent(socket, 'news', 3000)));
    await cluster.nodes[2].strapi.$io.raw({ event: 'news', data: { title: 'synthetic' } });
    const payloads = await received;
    assert.deepEqual(
      payloads.map((p) => p?.data?.title),
      ['synthetic', 'synthetic', 'synthetic', 'synthetic']
    );
    assert.equal(cluster.nodes[0].strapi.plugin('io').service('cluster').status().mode, 'database');
    await cluster.close();
  });

  test('IO-MP-02: websocketOnly turns off long-polling', async () => {
    const cluster = await startCluster(1);
    const node = cluster.nodes[0];
    assert.deepEqual(node.strapi.$io.server.engine.opts.transports, ['websocket']);
    const polling = await node.connect(undefined, { transports: ['polling'] });
    assert.ok(polling.error, 'polling handshake refused');
    await cluster.close();
  });

  test('IO-MP-03: a presence token issued on node A works once on node B; misses do not lock out the IP', async () => {
    const cluster = await startCluster(4);
    const [a, b, c] = cluster.nodes;
    const token = await adminSession(a, cluster.shared, { id: 1, firstname: 'Ada', lastname: 'Example' });
    const first = await b.connect({ strategy: 'admin-jwt', token });
    assert.equal(first.error, undefined);
    const replay = await c.connect({ strategy: 'admin-jwt', token });
    assert.equal(replay.error?.message, 'Authentication failed');
    for (let i = 0; i < 25; i += 1) await c.connect({ strategy: 'admin-jwt', token: `unknown-${i}` });
    const jwt = await c.connect({ strategy: 'api-token', token: 'tok-7' });
    assert.equal(jwt.error, undefined, 'other clients of the IP still connect');
    assert.equal(c.strapi.$io._handshake.failures.size(), 0, 'presence misses are not auth failures');
    await cluster.close();
  });

  test('IO-MP-04/05: a save on one node applies on the others; parallel saves keep both changes; stale revision is 409', async () => {
    const cluster = await startCluster(3);
    const [a, b, c] = cluster.nodes;
    const settingsA = a.strapi.plugin('io').service('settings');
    await settingsA.setSettings({ presence: { enabled: false, showTypingIndicator: true } });
    await until(() => c.strapi.plugin('io').service('settings').current().presence.enabled === false, 2000);

    await Promise.all([
      b.strapi
        .plugin('io')
        .service('settings')
        .setSettings({ subscriptions: { enabled: true, maxPerSocket: 7 } }),
      c.strapi
        .plugin('io')
        .service('settings')
        .setSettings({ cors: { origins: ['https://app.example.test'] } }),
    ]);
    const stored = await settingsA.getSettings();
    assert.equal(stored.subscriptions.maxPerSocket, 7);
    assert.deepEqual(stored.cors.origins, ['https://app.example.test']);
    assert.equal(stored.presence.enabled, false);
    assert.equal(cluster.shared.coreStore.length, 1, 'one settings row');

    const revision = settingsA.revision();
    let status = null;
    const ctx = {
      request: { body: { revision: revision - 1, presence: { enabled: true, showTypingIndicator: true } } },
      conflict: (message, details) => {
        status = 409;
        ctx.body = { error: { status: 409, message, details } };
      },
    };
    await a.strapi.plugin('io').controller('settings').updateSettings(ctx);
    assert.equal(status, 409);
    assert.equal(ctx.body.error.details.currentRevision, revision);
    assert.equal((await settingsA.getSettings()).presence.enabled, false, 'nothing saved');
    await cluster.close();
  });

  test('IO-MP-06/07: deleting an API token on node A disconnects its socket on node C', async () => {
    const cluster = await startCluster(3);
    const [a, , c] = cluster.nodes;
    const { socket, error } = await c.connect({ strategy: 'api-token', token: 'tok-7' });
    assert.equal(error, undefined);
    const disconnected = new Promise((resolve) => socket.once('disconnect', resolve));
    cluster.shared.tokens.splice(0, cluster.shared.tokens.length);
    await a.strapi.fireLifecycle('admin::api-token', 'afterDelete', {
      params: { where: { id: 7 } },
      result: { id: 7 },
    });
    const reason = await Promise.race([disconnected, sleep(3000).then(() => 'timeout')]);
    assert.notEqual(reason, 'timeout');
    await cluster.close();
  });

  test('IO-MP-08: editors on different nodes see each other in one list', async () => {
    const cluster = await startCluster(2);
    const [a, b] = cluster.nodes;
    const doc = { uid: 'api::article.article', documentId: 'doc1' };
    const ada = (
      await a.connect({
        strategy: 'admin-jwt',
        token: await adminSession(a, cluster.shared, { id: 1, firstname: 'Ada' }),
      })
    ).socket;
    const bo = (
      await b.connect({
        strategy: 'admin-jwt',
        token: await adminSession(b, cluster.shared, { id: 2, firstname: 'Bo' }),
      })
    ).socket;
    await ack(ada, 'presence:join', doc);
    const update = nextEvent(ada, 'presence:update', 3000);
    const reply = await ack(bo, 'presence:join', doc);
    assert.deepEqual(reply.editors.map((e) => e.id).sort(), [1, 2]);
    assert.deepEqual((await update).editors.map((e) => e.id).sort(), [1, 2]);
    const remote = await a.strapi.$io.server.in('presence:api::article.article:doc1').fetchSockets();
    assert.ok(
      remote.every((s) => !('adminAbility' in s.data) && !('clientIp' in s.data)),
      'IO-MP-14: no ability or IP in socket.data'
    );
    await cluster.close();
  });

  test('IO-MP-09: monitoring adds up every node; reset and the event log reach all nodes', async () => {
    const cluster = await startCluster(3);
    for (const node of cluster.nodes) await node.connect();
    await cluster.nodes[1].connect();
    for (const node of cluster.nodes) {
      await node.strapi.plugin('io').service('settings').refresh();
      node.strapi.plugin('io').service('monitoring').recordEvent('synthetic:event');
    }
    await cluster.nodes[0].strapi
      .plugin('io')
      .service('settings')
      .setSettings({
        monitoring: { enableConnectionLogging: false, enableEventLogging: true, maxEventLogSize: 100 },
      });
    await until(() =>
      cluster.nodes.every((n) => n.strapi.plugin('io').service('settings').current().monitoring.enableEventLogging)
    );
    for (const node of cluster.nodes) {
      node.strapi.plugin('io').service('monitoring').recordEvent('logged:event');
      await node.strapi.plugin('io').service('cluster').heartbeatNow();
    }
    const monitoring = cluster.nodes[0].strapi.plugin('io').service('monitoring');
    const stats = await monitoring.getClusterStats();
    assert.equal(stats.instances.count, 3);
    assert.equal(stats.connections.connected, 4);
    assert.equal(stats.events.totalEvents, 6);
    const log = await monitoring.collectEventLog(50);
    assert.equal(log.scope, 'all');
    assert.equal(log.entries.filter((e) => e.event === 'logged:event').length, 3);

    const ctx = {};
    await cluster.nodes[0].strapi.plugin('io').controller('monitoring').resetStats(ctx);
    await until(() =>
      cluster.nodes.every((n) => n.strapi.plugin('io').service('monitoring').getEventStats().totalEvents === 0)
    );
    await cluster.close();
  });

  test('IO-MP-11: the failed-handshake lockout and the connection cap count across nodes', async () => {
    const cluster = await startCluster(4);
    const messages = [];
    for (let i = 0; i < 21; i += 1) {
      const node = cluster.nodes[i % 4];
      messages.push((await node.connect({ strategy: 'api-token', token: `wrong-${i}` })).error?.message);
    }
    assert.equal(
      messages.slice(0, 19).every((m) => m === 'Authentication failed'),
      true
    );
    assert.equal(messages.at(-1), 'Too many authentication attempts. Try again later.');

    await cluster.nodes[0].strapi
      .plugin('io')
      .service('settings')
      .setSettings({
        connection: { maxConnections: 3, pingTimeout: 20000, pingInterval: 25000, connectionTimeout: 45000 },
        security: {
          requireAuthentication: false,
          rateLimiting: { enabled: false, maxEventsPerSecond: 10 },
          ipWhitelist: [],
          ipBlacklist: [],
        },
      });
    for (const node of cluster.nodes) await node.strapi.plugin('io').service('settings').refresh();
    // A new IP window: use a fresh counter by clearing the shared lockout.
    for (const node of cluster.nodes) node.strapi.$io._handshake.failures.clear('127.0.0.1');
    await cluster.nodes[0].connect();
    await cluster.nodes[1].connect();
    await cluster.nodes[2].connect();
    for (const node of cluster.nodes) await node.strapi.plugin('io').service('cluster').heartbeatNow();
    const full = await cluster.nodes[3].connect();
    assert.equal(full.error?.message, 'Server is at capacity. Try again later.');
    await cluster.close();
  });

  test('IO-MP-12: socket helpers reach sockets on other nodes', async () => {
    const cluster = await startCluster(3);
    const [a, b, c] = cluster.nodes;
    const { socket } = await c.connect();
    await until(() => socket.id);
    assert.equal(await a.strapi.$io.joinRoom(socket.id, 'chat-1'), true);
    await sleep(200);
    const message = nextEvent(socket, 'chat', 3000);
    await b.strapi.$io.raw({ event: 'chat', data: { text: 'hello' }, rooms: ['chat-1'] });
    assert.equal((await message)?.data?.text, 'hello');
    assert.equal(a.strapi.$io.joinRoom(socket.id, 'io-role-public'), false, 'plugin rooms stay refused');
    const subs = await a.strapi.$io.getEntitySubscriptions(socket.id);
    assert.deepEqual(subs, { success: true, subscriptions: [] });
    const gone = new Promise((resolve) => socket.once('disconnect', resolve));
    assert.equal(await a.strapi.$io.disconnectSocket(socket.id), true);
    assert.notEqual(await Promise.race([gone, sleep(3000).then(() => 'timeout')]), 'timeout');
    await cluster.close();
  });

  test('without an adapter: settings and revocations still reach other nodes through the signal table, with a warning', async () => {
    const cluster = await startCluster(2, { adapter: false });
    const [a, b] = cluster.nodes;
    for (const node of cluster.nodes) await node.strapi.plugin('io').service('cluster').heartbeatNow();
    assert.ok(
      [...a.strapi.logs.warn, ...b.strapi.logs.warn].some((m) => m.includes('no multi-server adapter')),
      'warns about the missing adapter'
    );
    await a.strapi
      .plugin('io')
      .service('settings')
      .setSettings({ presence: { enabled: false, showTypingIndicator: false } });
    await until(() => b.strapi.plugin('io').service('settings').current().presence.enabled === false, 2000);

    const { socket } = await b.connect({ strategy: 'api-token', token: 'tok-7' });
    const disconnected = new Promise((resolve) => socket.once('disconnect', resolve));
    cluster.shared.tokens.splice(0, cluster.shared.tokens.length);
    await a.strapi.fireLifecycle('admin::api-token', 'afterDelete', {
      params: { where: { id: 7 } },
      result: { id: 7 },
    });
    assert.notEqual(await Promise.race([disconnected, sleep(3000).then(() => 'timeout')]), 'timeout');
    const log = await a.strapi.plugin('io').service('monitoring').collectEventLog(10);
    assert.equal(log.scope, 'instance', 'event log is labelled as this instance only');
    await cluster.close();
  });

  test('a process that shuts down closes only its own clients, and they may reconnect (rolling deploy)', async () => {
    const cluster = await startCluster(2);
    const [a, b] = cluster.nodes;
    const onA = (await a.connect()).socket;
    const onB = (await b.connect()).socket;
    const reasonA = new Promise((resolve) => onA.once('disconnect', resolve));
    let bDropped = null;
    onB.once('disconnect', (reason) => {
      bDropped = reason;
    });
    // What plugin destroy does on SIGINT/SIGTERM (pm2 reload, Railway deploy).
    await a.strapi.$io.destroy();
    assert.equal(
      await Promise.race([reasonA, sleep(3000).then(() => 'timeout')]),
      'transport close',
      'not "io server disconnect", after which socket.io-client gives up'
    );
    await sleep(500);
    assert.equal(bDropped, null, 'clients of the other process stay connected');
    assert.equal(onB.connected, true);
    await cluster.close();
  });

  test('a lockout started on one node refuses that IP on every node, even without new failures there', async () => {
    const cluster = await startCluster(3);
    for (let i = 0; i < 20; i += 1) await cluster.nodes[0].connect({ strategy: 'api-token', token: `wrong-${i}` });
    for (const node of cluster.nodes) {
      await until(() => node.strapi.$io._handshake.failures.isBlocked('127.0.0.1'), 2000);
      const { error } = await node.connect();
      assert.equal(error?.message, 'Too many authentication attempts. Try again later.');
    }
    await cluster.close();
  });

  test('the connection cap re-reads stale peer counts instead of waiting for its own next heartbeat', async () => {
    const cluster = await startCluster(3);
    const [a, b, c] = cluster.nodes;
    await a.strapi
      .plugin('io')
      .service('settings')
      .setSettings({
        connection: { maxConnections: 2, pingTimeout: 20000, pingInterval: 25000, connectionTimeout: 45000 },
      });
    for (const node of cluster.nodes) await node.strapi.plugin('io').service('settings').refresh();
    // c reads the node table before a and b have connections.
    await c.strapi.plugin('io').service('cluster').heartbeatNow();
    await a.connect();
    await b.connect();
    await a.strapi.plugin('io').service('cluster').heartbeatNow();
    await b.strapi.plugin('io').service('cluster').heartbeatNow();
    await sleep(200); // > pollInterval of the test cluster
    const full = await c.connect();
    assert.equal(full.error?.message, 'Server is at capacity. Try again later.');
    await cluster.close();
  });

  test('eight saves without a revision at the same time on four nodes all succeed and none is lost', async () => {
    const cluster = await startCluster(4);
    const base = await cluster.nodes[0].strapi.plugin('io').service('settings').getSettings();
    const edits = {
      cors: { origins: ['https://app.example.test'] },
      connection: { ...base.connection, pingInterval: 26000 },
      security: { ...base.security, rateLimiting: { enabled: false, maxEventsPerSecond: 11 } },
      events: { ...base.events, excludeFields: ['proofField'] },
      rolePermissions: { authenticated: { canConnect: true } },
      presence: { enabled: true, showTypingIndicator: false },
      subscriptions: { enabled: false, maxPerSocket: 77 },
      monitoring: { ...base.monitoring, maxEventLogSize: 123 },
    };
    const results = await Promise.allSettled(
      Object.entries(edits).map(([key, value], i) =>
        cluster.nodes[i % 4].strapi
          .plugin('io')
          .service('settings')
          .setSettings({ [key]: value })
      )
    );
    assert.deepEqual(
      results.map((r) => r.status),
      Array(8).fill('fulfilled')
    );
    const stored = await cluster.nodes[1].strapi.plugin('io').service('settings').getSettings();
    for (const [key, value] of Object.entries(edits)) assert.deepEqual(stored[key], value, key);
    assert.equal(cluster.nodes[1].strapi.plugin('io').service('settings').revision(), 8);
    await cluster.close();
  });

  test('IO-RA-01: losing the adapter LISTEN connection neither crashes the process nor stops cross-node delivery', async () => {
    const cluster = await startCluster(2);
    const [a, b] = cluster.nodes;
    const admin = knexFactory({ client: 'pg', connection: PG_URL, pool: { min: 0, max: 1 } });
    const listeners = async () =>
      (
        await admin.raw(
          `SELECT pid FROM pg_stat_activity WHERE application_name = 'strapi-plugin-io' AND query LIKE ?`,
          [`LISTEN "${cluster.channelPrefix}#%`]
        )
      ).rows.map((r) => r.pid);
    const before = await until(async () => {
      const pids = await listeners();
      return pids.length === 2 && pids;
    });
    // What a Postgres restart, failover or idle_session_timeout does to the connection.
    await admin.raw('SELECT pg_terminate_backend(pid) FROM unnest(?::int[]) AS pid', [before]);
    // Both adapters reconnect after 1-3 s with new backends.
    await until(async () => {
      const pids = await listeners();
      return pids.length === 2 && pids.every((pid) => !before.includes(pid));
    }, 8000);
    assert.ok(
      [...a.strapi.logs.warn, ...b.strapi.logs.warn].some((m) => m.includes('postgres adapter error')),
      'the error reached the handler'
    );
    // Delivery and the control channel work again.
    const { socket } = await b.connect();
    const received = nextEvent(socket, 'after-restart', 4000);
    await a.strapi.$io.raw({ event: 'after-restart', data: { ok: true } });
    assert.equal((await received)?.data?.ok, true);
    const replies = await a.strapi
      .plugin('io')
      .service('cluster')
      .askPeers(a.strapi.plugin('io').service('cluster').EVENT_LOG_REQUEST, 1);
    assert.equal(replies.length, 1, 'serverSideEmit with ack is answered by the other node');
    await admin.destroy();
    await cluster.close();
  });

  test('IO-RA-02: a room name passed as socket id joins, leaves and disconnects nobody on any node', async () => {
    const cluster = await startCluster(2);
    const [a, b] = cluster.nodes;
    const clients = [];
    for (let i = 0; i < 3; i += 1) clients.push((await b.connect()).socket);
    assert.equal(await a.strapi.$io.joinRoom('io-role-public', 'chat-private'), false);
    let leaked = 0;
    for (const c of clients) c.on('secret', () => (leaked += 1));
    await a.strapi.$io.raw({ event: 'secret', data: {}, rooms: ['chat-private'] });
    assert.equal(await a.strapi.$io.disconnectSocket('io-role-public'), false);
    assert.equal(await a.strapi.$io.disconnectSocket('io-role-authenticated'), false);
    assert.equal(await a.strapi.$io._remoteSocket('io-role-public'), null);
    assert.deepEqual(await a.strapi.$io.subscribeToEntity('io-role-public', 'api::article.article', 'doc1'), {
      success: false,
      error: 'Socket not found',
    });
    await sleep(500);
    assert.equal(leaked, 0, 'the private room reached nobody');
    assert.equal(
      clients.every((c) => c.connected),
      true,
      'nobody was disconnected'
    );
    // The exact id of a socket on node B still works from node A.
    const target = clients[1];
    const gone = new Promise((resolve) => target.once('disconnect', resolve));
    assert.equal(await a.strapi.$io.disconnectSocket(target.id), true);
    assert.notEqual(await Promise.race([gone, sleep(3000).then(() => 'timeout')]), 'timeout');
    assert.equal(clients[0].connected && clients[2].connected, true, 'only that one socket');
    await cluster.close();
  });

  test('IO-RA-03: a signal committed after a higher id is still delivered (no adapter)', async () => {
    const cluster = await startCluster(2, { adapter: false });
    const [a, b] = cluster.nodes;
    const got = [];
    b.strapi
      .plugin('io')
      .service('cluster')
      .on('proof-kind', (payload) => got.push(payload.name));
    const writer = knexFactory({ client: 'pg', connection: PG_URL, pool: { min: 0, max: 2 } });
    const trx = await writer.transaction();
    // The slow signal takes its id first but commits last.
    await trx(TABLES.signals).insert({
      uid: `slow-${randomBytes(4).toString('hex')}`,
      kind: 'proof-kind',
      origin: 'elsewhere',
      payload: JSON.stringify({ name: 'slow' }),
      created_at: Date.now(),
    });
    await a.strapi.plugin('io').service('cluster').publish('proof-kind', { name: 'fast' });
    await b.strapi.plugin('io').service('cluster').pollNow();
    assert.deepEqual(got, ['fast']);
    await trx.commit();
    await b.strapi.plugin('io').service('cluster').pollNow();
    assert.deepEqual(got, ['fast', 'slow']);
    await writer.destroy();
    await cluster.close();
  });
}
