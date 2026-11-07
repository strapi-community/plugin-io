import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import knexFactory from 'knex';
import { createDatabaseStore, createMemoryStore, sha256, TABLES } from '../server/src/cluster/store.js';
import { createNodeId, detectClusterEnv, isClusterAdapter } from '../server/src/cluster/env.js';

/**
 * PostgreSQL runs only when IO_TEST_PG_URL points at a disposable database,
 * for example postgres://strapi@127.0.0.1:5440/mi_io.
 */
const PG_URL = process.env.IO_TEST_PG_URL;

/**
 * better-sqlite3 is a native module; installs with --ignore-scripts (some
 * workflows) have no binding until `npm rebuild better-sqlite3`.
 */
const sqliteAvailable = await import('better-sqlite3')
  .then(({ default: Database }) => {
    new Database(':memory:').close();
    return true;
  })
  .catch(() => false);

const token = (adminId, now, extra = {}) => ({
  adminId: String(adminId),
  firstname: 'Ada',
  lastname: 'Example',
  sessionId: null,
  expiresAt: now + 60_000,
  createdAt: now,
  ...extra,
});

/**
 * Runs the same contract against one backend.
 *
 * @param {string} name - Backend name.
 * @param {() => Promise<{ store: any, close: () => Promise<void> }>} open - Opens a fresh store.
 * @param {{ shared?: boolean }} [options] - Whether nodes and signals are stored.
 */
function contract(name, open, { shared = true } = {}) {
  test(`${name}: a presence token is accepted exactly once, even by parallel consumers`, async () => {
    const { store, close } = await open();
    const now = Date.now();
    await store.putToken(sha256('t1'), token(1, now));
    const results = await Promise.all(Array.from({ length: 8 }, () => store.takeToken(sha256('t1'), now)));
    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(results.find(Boolean).adminId, '1');
    assert.equal(await store.takeToken(sha256('t1'), now), null, 'replay refused');
    await close();
  });

  test(`${name}: expired tokens are refused and swept; caps count per admin`, async () => {
    const { store, close } = await open();
    const now = Date.now();
    await store.putToken(sha256('old'), token(2, now - 10, { expiresAt: now - 1 }));
    assert.equal(await store.takeToken(sha256('old'), now), null);
    for (let i = 0; i < 7; i += 1) await store.putToken(sha256(`a${i}`), token(3, now + i));
    await store.trimAdminTokens('3', 4);
    assert.equal(await store.countTokens(now, '3'), 4);
    assert.equal(await store.takeToken(sha256('a0'), now), null, 'oldest dropped');
    assert.ok(await store.takeToken(sha256('a6'), now), 'newest kept');
    await store.putToken(sha256('gone'), token(4, now, { expiresAt: now + 5 }));
    await store.sweepTokens(now + 10);
    assert.equal(await store.takeToken(sha256('gone'), now), null);
    await close();
  });

  test(`${name}: counter increments are exact under parallel hits and restart after the window`, async () => {
    const { store, close } = await open();
    const now = Date.now();
    const hits = await Promise.all(Array.from({ length: 24 }, () => store.hit('hs:x', 60_000, now)));
    assert.deepEqual(
      hits.map((h) => h.hits).sort((a, b) => a - b),
      Array.from({ length: 24 }, (_, i) => i + 1),
      'every caller sees its own count'
    );
    const later = await store.hit('hs:x', 60_000, now + 61_000);
    assert.equal(later.hits, 1, 'new window');
    await store.clearCounter('hs:x');
    assert.equal((await store.hit('hs:x', 60_000, now + 62_000)).hits, 1);
    await close();
  });

  if (!shared) return;

  test(`${name}: node heartbeats and signals`, async () => {
    const { store, close } = await open();
    const now = Date.now();
    await store.beat('a', { connections: 3 }, now, now);
    await store.beat('b', { connections: 4 }, now - 60_000, now - 60_000);
    await store.beat('a', { connections: 5 }, now + 1, now);
    const alive = await store.listNodes(now - 30_000);
    assert.deepEqual(
      alive.map((n) => [n.nodeId, n.stats.connections]),
      [['a', 5]]
    );
    await store.pruneNodes(now - 30_000);
    assert.equal((await store.listNodes(0)).length, 1);
    await store.removeNode('a');
    assert.equal((await store.listNodes(0)).length, 0);

    const start = await store.lastSignalId();
    await store.pushSignal({ uid: 'u1', kind: 'settings', origin: 'a', payload: { revision: 3 } }, now);
    await store.pushSignal({ uid: 'u2', kind: 'revalidate', origin: 'b', payload: { kind: 'user', ids: [1] } }, now);
    const signals = await store.signalsAfter(start);
    assert.deepEqual(
      signals.map((s) => [s.uid, s.kind, s.payload]),
      [
        ['u1', 'settings', { revision: 3 }],
        ['u2', 'revalidate', { kind: 'user', ids: [1] }],
      ]
    );
    assert.equal((await store.signalsAfter(signals[1].id)).length, 0);
    await store.pruneSignals(now + 1);
    assert.equal((await store.signalsAfter(0)).length, 0);
    await close();
  });

  test(`${name}: tables store hashes, never raw tokens`, async () => {
    const { store, close, knex } = await open();
    const now = Date.now();
    await store.putToken(sha256('secret-token'), token(9, now));
    const rows = await knex(TABLES.presence).select('*');
    assert.ok(!JSON.stringify(rows).includes('secret-token'));
    await close();
  });
}

contract('memory', async () => ({ store: createMemoryStore(), close: async () => {} }), { shared: false });

if (!sqliteAvailable) {
  test(
    'sqlite store contract (run npm rebuild better-sqlite3)',
    { skip: 'better-sqlite3 binding not built' },
    () => {}
  );
} else
  contract('sqlite', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'io-store-'));
    const knex = knexFactory({
      client: 'better-sqlite3',
      connection: { filename: join(dir, 'db.sqlite') },
      useNullAsDefault: true,
    });
    const store = createDatabaseStore({ knex, dialect: 'sqlite' });
    await store.ensure();
    await store.ensure();
    return {
      store,
      knex,
      close: async () => {
        await knex.destroy();
        rmSync(dir, { recursive: true, force: true });
      },
    };
  });

if (PG_URL) {
  contract('postgres', async () => {
    // node --test runs files in parallel and tests/cluster.test.mjs wipes the
    // plugin tables of the same database, so this file uses its own schema.
    const schema = `io_store_test_${process.pid}_${Date.now()}`;
    const admin = knexFactory({ client: 'pg', connection: PG_URL, pool: { min: 0, max: 1 } });
    await admin.raw('CREATE SCHEMA IF NOT EXISTS ??', [schema]);
    const knex = knexFactory({
      client: 'pg',
      connection: PG_URL,
      searchPath: [schema],
      pool: { min: 0, max: 6 },
    });
    const store = createDatabaseStore({ knex, dialect: 'postgres' });
    // Several processes creating the tables at once.
    await Promise.all([store.ensure(), store.ensure(), store.ensure()]);
    for (const table of Object.values(TABLES)) await knex(table).del();
    return {
      store,
      knex,
      close: async () => {
        await knex.destroy();
        await admin.raw('DROP SCHEMA IF EXISTS ?? CASCADE', [schema]);
        await admin.destroy();
      },
    };
  });
} else {
  test('postgres store contract (set IO_TEST_PG_URL to run)', { skip: 'IO_TEST_PG_URL not set' }, () => {});
}

test('cluster detection: pm2 cluster workers and Railway replicas; node ids hide the host name', () => {
  assert.deepEqual(detectClusterEnv({}, { isWorker: false }), {
    clustered: false,
    worker: false,
    railway: false,
    reasons: [],
  });
  const pm2 = detectClusterEnv({ NODE_APP_INSTANCE: '0' }, { isWorker: false });
  assert.equal(pm2.clustered, false, 'pm2 fork mode is one process');
  assert.equal(detectClusterEnv({}, { isWorker: true }).worker, true);
  const railway = detectClusterEnv({ RAILWAY_REPLICA_ID: 'abc-123' }, { isWorker: false });
  assert.equal(railway.clustered, true);
  assert.equal(railway.worker, false, 'one Railway replica is not known to have peers');
  const id = createNodeId({ RAILWAY_REPLICA_ID: 'abcdef12-3456-7890' });
  assert.match(id, /^abcdef12-[0-9a-f]{10}:\d+:[0-9a-f]{6}$/);
  assert.notEqual(createNodeId({}), createNodeId({}));
});

test('isClusterAdapter: in-memory adapters are not, Redis/Postgres-like ones are', () => {
  class Adapter {}
  class SessionAwareAdapter {}
  class PostgresAdapter {}
  assert.equal(isClusterAdapter(new Adapter()), false);
  assert.equal(isClusterAdapter(new SessionAwareAdapter()), false);
  assert.equal(isClusterAdapter(new PostgresAdapter()), true);
  assert.equal(isClusterAdapter(undefined), false);
});
