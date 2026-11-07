import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import knexFactory from 'knex';
import { guardListenPool } from '../server/src/cluster/adapter.js';
import { TABLES } from '../server/src/cluster/store.js';
import createSubscriptions from '../server/src/services/subscriptions.js';
import { ROW_KEY } from '../server/src/services/settings.js';
import { createStrapi } from './helpers/strapi-stub.mjs';
import { startHost } from './helpers/socket-host.mjs';

/**
 * Races and lookups that only show up with several processes, reproduced
 * deterministically in one process (no PostgreSQL needed). The same cases run
 * against PostgreSQL in cluster.test.mjs when IO_TEST_PG_URL is set.
 */

const require = createRequire(import.meta.url);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ARTICLE = 'api::article.article';

let sqliteAvailable = true;
try {
  const Database = require('better-sqlite3');
  new Database(':memory:').close();
} catch {
  sqliteAvailable = false;
}

test('IO-RA-01: the adapter pool facade handles an ended LISTEN client (no crash, slot freed)', async () => {
  const { EventEmitter } = await import('node:events');
  const released = [];
  const errors = [];
  const client = new EventEmitter();
  client.release = (error) => {
    if (released.length) throw new Error('Release called on client which has already been released to the pool.');
    released.push(error);
  };
  const pool = { connect: async () => client, query: async (text) => ({ text }) };
  const facade = guardListenPool(pool, (error) => errors.push(error.code));

  const listen = await facade.connect();
  // What pg does when the server ends a checked-out connection: 'error', then 'end'.
  const terminated = Object.assign(new Error('terminating connection due to administrator command'), { code: '57P01' });
  assert.doesNotThrow(() => listen.emit('error', terminated), 'an error event without a listener would throw');
  listen.emit('end');
  assert.deepEqual(errors, ['57P01']);
  assert.equal(released.length, 1, 'the dead client is released with an error, so pg-pool removes it');
  assert.ok(released[0] instanceof Error);
  // The adapter's own close() after that: removeAllListeners('end') + release() must not throw through the facade.
  assert.deepEqual(await facade.query('SELECT 1'), { text: 'SELECT 1' });
});

test('IO-RA-02: without an adapter a room name is never treated as a socket id', async () => {
  const host = await startHost({ usersPermissions: { service: () => undefined } });
  const { socket } = await host.connect();
  const io = host.strapi.$io;
  assert.equal(io.joinRoom('io-role-public', 'chat-private'), false);
  assert.equal(io.leaveRoom('io-role-public', 'chat-private'), false);
  assert.equal(io.disconnectSocket('io-role-public'), false);
  assert.deepEqual(await io.subscribeToEntity('io-role-public', ARTICLE, 'doc'), {
    success: false,
    error: 'Socket not found',
  });
  assert.equal(socket.connected, true);
  await host.close();
});

test('IO-RA-02: with a multi-server adapter, a room name passed as socket id selects nobody', async () => {
  const host = await startHost({ usersPermissions: { service: () => undefined } });
  const io = host.strapi.$io;
  const clients = [];
  for (let i = 0; i < 3; i += 1) clients.push((await host.connect()).socket);
  // Make the in-memory adapter look like one that spans servers; fetchSockets()
  // and the operators then run the same code path as with Postgres or Redis.
  io._spansServers = () => true;
  const joined = io.joinRoom('io-role-public', 'chat-private');
  assert.ok(joined instanceof Promise, 'the remote path is asynchronous');
  assert.equal(await joined, false);
  assert.equal(await io.disconnectSocket('io-role-public'), false);
  assert.equal(await io.leaveRoom('io-role-public', 'chat-private'), false);
  assert.equal(await io._remoteSocket('io-role-public'), null);
  assert.deepEqual(await io.getEntitySubscriptions('io-role-public'), { success: false, error: 'Socket not found' });
  await sleep(50);
  assert.equal(
    clients.every((c) => c.connected),
    true,
    'nobody was disconnected'
  );
  assert.equal(io.server.of('/').adapter.rooms.get('chat-private'), undefined, 'nobody joined the private room');
  // An exact socket id still works through the same path.
  const target = clients[0];
  const exact = await io._fetchExactSocket(target.id);
  assert.equal(exact?.id, target.id);
  await host.close();
});

test('IO-RA-04: a slow refresh that read an older revision does not roll the snapshot back', async () => {
  const coreStore = [];
  const a = createStrapi({ coreStore });
  const b = createStrapi({ coreStore });
  const settingsA = a.plugin('io').service('settings');
  const settingsB = b.plugin('io').service('settings');
  await settingsA.load();
  await settingsB.load();
  const base = settingsA.current().security;
  await settingsA.setSettings({ security: { ...base, requireAuthentication: false } });
  await settingsB.refresh();
  assert.equal(settingsB.revision(), 1);

  // B's periodic refresh reads revision 1, then stalls before applying it.
  const coreQuery = b.db.query('strapi::core-store');
  const originalQuery = b.db.query.bind(b.db);
  let stall = true;
  b.db.query = (uid) => {
    if (uid !== 'strapi::core-store' || !stall) return originalQuery(uid);
    stall = false;
    return {
      ...coreQuery,
      findMany: async (args) => {
        const rows = await coreQuery.findMany(args);
        await sleep(200);
        return rows;
      },
    };
  };
  const slow = settingsB.refresh();
  await sleep(20);
  await settingsA.setSettings({ security: { ...base, requireAuthentication: true } });
  await settingsB.refresh(); // the cluster signal
  assert.equal(settingsB.revision(), 2);
  await slow;
  assert.equal(settingsB.revision(), 2, 'revision stays at 2');
  assert.equal(settingsB.current().security.requireAuthentication, true, 'the newer security setting stays');
  b.db.query = originalQuery;

  // A row deleted and created again starts at revision 0: a different row id is applied.
  coreStore.splice(0, coreStore.length);
  coreStore.push({
    id: 50,
    key: ROW_KEY,
    value: JSON.stringify({ revision: 0, presence: { enabled: false, showTypingIndicator: false } }),
    type: 'object',
    environment: null,
    tag: null,
  });
  await settingsB.refresh();
  assert.equal(settingsB.revision(), 0);
  assert.equal(settingsB.current().presence.enabled, false);
});

test('IO-RA-05: parallel subscribeToEntity calls for one socket on another server stay within maxPerSocket', async () => {
  const maxPerSocket = 3;
  const services = {
    settings: { current: () => ({ subscriptions: { enabled: true, maxPerSocket }, events: { onlyPublished: false } }) },
    strategy: {
      role: { getRoomName: (role) => `io-role-${role.type}` },
      token: { getRoomName: (t) => `io-token-${t.id}` },
    },
    rooms: { getAudiences: async () => [{ name: 'io-role-public' }], canRead: () => true },
  };
  const strapi = {
    plugin: () => ({ service: (name) => services[name] }),
    contentTypes: { [ARTICLE]: { options: {} } },
    db: { query: () => ({ findOne: async () => sleep(5).then(() => ({ id: 1 })) }) },
    log: { warn() {} },
  };
  const service = createSubscriptions({ strapi });
  // The socket's rooms on its own server. A join arrives there only later
  // (adapter round trip), as with Postgres NOTIFY or Redis pub/sub.
  const serverRooms = new Set(['remote-id']);
  const remoteWrapper = () => {
    const wrapper = {
      id: 'remote-id',
      remote: true,
      data: { kind: 'public', role: { type: 'public' } },
      rooms: new Set(serverRooms),
      connected: true,
      join: (room) => setTimeout(() => serverRooms.add(room), 50),
      leave: (room) => setTimeout(() => serverRooms.delete(room), 50),
      refresh: async () => {
        await sleep(1);
        wrapper.rooms = new Set(serverRooms);
        return true;
      },
    };
    return wrapper;
  };
  // Like $io.subscribeToEntity: a new wrapper with its own room snapshot per call.
  const replies = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      service.subscribe(remoteWrapper(), { uid: ARTICLE, documentId: `doc-${index}` })
    )
  );
  assert.equal(replies.filter((reply) => reply.success).length, maxPerSocket);
  await sleep(80);
  assert.equal([...serverRooms].filter((r) => r.startsWith('io-entity-')).length, maxPerSocket);
  // A later call sees the joined rooms and is refused too.
  assert.equal((await service.subscribe(remoteWrapper(), { uid: ARTICLE, documentId: 'doc-late' })).success, false);
});

if (!sqliteAvailable) {
  test('IO-RA-03 (run npm rebuild better-sqlite3)', { skip: 'better-sqlite3 binding not built' }, () => {});
} else {
  test('IO-RA-03: a signal whose lower id becomes visible after a higher one is still delivered', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'io-signals-'));
    const knex = knexFactory({
      client: 'better-sqlite3',
      connection: { filename: join(dir, 'db.sqlite') },
      useNullAsDefault: true,
    });
    try {
      const strapi = createStrapi({
        knex,
        dialect: 'sqlite',
        config: { cluster: { enabled: true, pollInterval: 60_000, heartbeatInterval: 60_000 } },
      });
      const cluster = strapi.plugin('io').service('cluster');
      const io = {
        of: () => ({ adapter: {}, on() {}, off() {} }),
        engine: { opts: { transports: ['websocket'] } },
      };
      await cluster.start({ io });
      const received = [];
      cluster.on('revalidate', (payload) => received.push(payload.name));
      const row = (id, name) => ({
        id,
        uid: `uid-${name}`,
        kind: 'revalidate',
        origin: 'other-node',
        payload: JSON.stringify({ name }),
        created_at: Date.now(),
      });
      // Id 1 was taken by a transaction that has not committed yet; id 2 committed.
      await knex(TABLES.signals).insert(row(2, 'fast'));
      await cluster.pollNow();
      assert.deepEqual(received, ['fast']);
      // Now id 1 commits.
      await knex(TABLES.signals).insert(row(1, 'slow'));
      await cluster.pollNow();
      assert.deepEqual(received, ['fast', 'slow'], 'the late lower id is delivered');
      await cluster.pollNow();
      assert.deepEqual(received, ['fast', 'slow'], 'and only once');
      await cluster.stop();
    } finally {
      await knex.destroy();
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
