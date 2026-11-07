import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createConfiguredAdapter, normalizeAdapterConfig, pgConnection } from '../server/src/cluster/adapter.js';
import { createMemoryStore } from '../server/src/cluster/store.js';
import { createSharedFailureLimiter } from '../server/src/services/rate-limit.js';
import { ROW_KEY } from '../server/src/services/settings.js';
import { createStrapi } from './helpers/strapi-stub.mjs';
import { startHost } from './helpers/socket-host.mjs';

const usersPermissions = { service: () => undefined };

test('one process stays in single mode: no tables, no timers, no warnings (backward compatible)', async () => {
  const host = await startHost({ usersPermissions });
  const cluster = host.strapi.plugin('io').service('cluster');
  assert.deepEqual(cluster.status(), {
    mode: 'single',
    adapter: 'memory',
    clusterAdapter: false,
    instances: 1,
    warnings: [],
  });
  assert.equal(cluster.store().mode, 'memory');
  assert.deepEqual(host.strapi.logs.warn, []);
  await cluster.publish('settings', { revision: 1 });
  await host.close();
});

test('settings: every save increments the revision; a stale revision is a conflict and saves nothing', async () => {
  const strapi = createStrapi();
  const settings = strapi.plugin('io').service('settings');
  await settings.load();
  assert.equal(settings.revision(), 0);
  await settings.setSettings({ presence: { enabled: false, showTypingIndicator: true } });
  assert.equal(settings.revision(), 1);
  await settings.setSettings({ revision: 1, subscriptions: { enabled: true, maxPerSocket: 5 } });
  assert.equal(settings.revision(), 2);
  await assert.rejects(
    settings.setSettings({ revision: 1, subscriptions: { enabled: false, maxPerSocket: 5 } }),
    (error) => error.name === 'SettingsConflictError' && error.currentRevision === 2
  );
  const stored = JSON.parse(strapi.coreStore.find((r) => r.key === ROW_KEY).value);
  assert.equal(stored.revision, 2);
  assert.equal(stored.subscriptions.enabled, true);
  assert.equal(stored.presence.enabled, false, 'the earlier save is kept');
});

test('settings: parallel partial saves both survive (compare-and-swap with retry)', async () => {
  const coreStore = [];
  const a = createStrapi({ coreStore });
  const b = createStrapi({ coreStore });
  await Promise.all([
    a
      .plugin('io')
      .service('settings')
      .setSettings({ presence: { enabled: false, showTypingIndicator: false } }),
    b
      .plugin('io')
      .service('settings')
      .setSettings({ cors: { origins: ['https://app.example.test'] } }),
  ]);
  const stored = JSON.parse(coreStore[0].value);
  assert.equal(coreStore.length, 1);
  assert.equal(stored.presence.enabled, false);
  assert.deepEqual(stored.cors.origins, ['https://app.example.test']);
  assert.equal(stored.revision, 2);
});

test('settings: duplicate rows from concurrent first saves are reduced to the oldest', async () => {
  const value = (presence) =>
    JSON.stringify({ version: 2, revision: 1, presence: { enabled: presence, showTypingIndicator: true } });
  const coreStore = [
    { id: 4, key: ROW_KEY, value: value(false), type: 'object', environment: null, tag: null },
    { id: 9, key: ROW_KEY, value: value(true), type: 'object', environment: null, tag: null },
  ];
  const strapi = createStrapi({ coreStore });
  const loaded = await strapi.plugin('io').service('settings').load();
  assert.equal(loaded.presence.enabled, false);
  assert.deepEqual(
    coreStore.map((r) => r.id),
    [4]
  );
});

test('settings: refresh applies a newer revision saved by another process and notifies listeners', async () => {
  const coreStore = [];
  const a = createStrapi({ coreStore });
  const b = createStrapi({ coreStore });
  const settingsB = b.plugin('io').service('settings');
  await settingsB.load();
  const seen = [];
  settingsB.onChange((next) => seen.push(next.connection.pingInterval));
  await a
    .plugin('io')
    .service('settings')
    .setSettings({
      connection: { maxConnections: 0, pingTimeout: 20000, pingInterval: 30000, connectionTimeout: 45000 },
    });
  assert.equal(settingsB.current().connection.pingInterval, 25000, 'not applied before refresh');
  await settingsB.refresh();
  await settingsB.refresh();
  assert.deepEqual(seen, [30000], 'listeners run once per revision');
});

test('PUT /io/settings answers 409 with the current revision; GET and PUT return meta.revision', async () => {
  const strapi = createStrapi();
  const controller = strapi.plugin('io').controller('settings');
  const get = {};
  await controller.getSettings(get);
  assert.equal(get.body.meta.revision, 0);
  const put = { request: { body: { revision: 0, presence: { enabled: false, showTypingIndicator: true } } } };
  await controller.updateSettings(put);
  assert.equal(put.body.meta.revision, 1);
  const stale = {
    request: { body: { revision: 0, presence: { enabled: true, showTypingIndicator: true } } },
    conflict(message, details) {
      this.status = 409;
      this.body = { error: { status: 409, message, details } };
    },
  };
  await controller.updateSettings(stale);
  assert.equal(stale.status, 409);
  assert.deepEqual(stale.body.error.details, { currentRevision: 1 });
});

test('shared failure limiter: blocks once the shared count reaches the limit and never reads on success', async () => {
  const store = createMemoryStore();
  let hits = 0;
  const counting = { ...store, hit: (...args) => ((hits += 1), store.hit(...args)) };
  const a = createSharedFailureLimiter({ store: () => counting, maxFailures: 4 });
  const b = createSharedFailureLimiter({ store: () => counting, maxFailures: 4 });
  await a.fail('203.0.113.9');
  await b.fail('203.0.113.9');
  await a.fail('203.0.113.9');
  assert.equal(b.isBlocked('203.0.113.9'), false, 'b has not seen the block yet');
  assert.equal(await b.fail('203.0.113.9'), true, 'fourth failure across processes blocks');
  assert.equal(b.isBlocked('203.0.113.9'), true);
  assert.equal(hits, 4);
  b.isBlocked('198.51.100.1');
  assert.equal(hits, 4, 'checks are local');
  const broken = createSharedFailureLimiter({
    store: () => ({ hit: async () => Promise.reject(new Error('db down')), clearCounter: async () => {} }),
    maxFailures: 2,
  });
  await broken.fail('192.0.2.1');
  assert.equal(await broken.fail('192.0.2.1'), true, 'falls back to the local count');
});

test('presence token misses use their own limit and do not lock out the IP (IO-MP-03)', async () => {
  const host = await startHost({ usersPermissions });
  for (let i = 0; i < 25; i += 1) {
    const { error } = await host.connect({ strategy: 'admin-jwt', token: `missing-${i}` });
    assert.equal(error.message, 'Authentication failed');
  }
  assert.equal(host.strapi.$io._handshake.failures.size(), 0);
  const ok = await host.connect();
  assert.equal(ok.error, undefined, 'public clients of the same IP still connect');
  await host.close();
});

test('IO-MP-14: the admin ability and client IP are not in socket.data', async () => {
  const host = await startHost({ usersPermissions });
  host.strapi.state.admins.push({ id: 1, isActive: true, blocked: false, permissions: [] });
  const { token } = await host.strapi.plugin('io').service('presence').createSessionToken({ id: 1 });
  await host.connect({ strategy: 'admin-jwt', token });
  await host.connect();
  for (const socket of host.strapi.$io.server.of('/').sockets.values()) {
    assert.equal('adminAbility' in socket.data, false);
    assert.equal('clientIp' in socket.data, false);
  }
  await host.close();
});

test('socket helpers without a multi-server adapter keep the old answers for unknown sockets', async () => {
  const host = await startHost({ usersPermissions });
  const io = host.strapi.$io;
  assert.equal(io.joinRoom('nope', 'chat'), false);
  assert.equal(io.leaveRoom('nope', 'chat'), false);
  assert.equal(io.disconnectSocket('nope'), false);
  assert.deepEqual(io.unsubscribeFromEntity('nope', 'api::article.article', 'x'), {
    success: false,
    error: 'Socket not found',
  });
  assert.deepEqual(io.getEntitySubscriptions('nope'), { success: false, error: 'Socket not found' });
  await host.close();
});

test('adapter config: shorthands, missing packages and connection defaults', async () => {
  assert.equal(normalizeAdapterConfig(undefined), null);
  assert.deepEqual(normalizeAdapterConfig('redis'), { type: 'redis', options: {} });
  assert.equal(normalizeAdapterConfig(() => null).type, 'custom');
  assert.equal(normalizeAdapterConfig({ create: () => null }).type, 'custom');
  const strapi = {
    config: {
      get: (path) =>
        path === 'database.connection'
          ? {
              client: 'postgres',
              connection: { host: 'db.internal', port: 5432, database: 'app', user: 'u', schema: 'public' },
            }
          : undefined,
    },
    log: { warn() {} },
  };
  assert.deepEqual(pgConnection({}, strapi), { host: 'db.internal', port: 5432, database: 'app', user: 'u' });
  assert.deepEqual(pgConnection({ connectionString: 'postgres://x' }, strapi), { connectionString: 'postgres://x' });
  assert.throws(
    () => pgConnection({}, { config: { get: () => ({ client: 'sqlite' }) } }),
    /needs a PostgreSQL database/
  );
  await assert.rejects(createConfiguredAdapter({ type: 'mongo' }, { strapi }), /Unknown socket.adapter type/);
  await assert.rejects(createConfiguredAdapter({ type: 'redis' }, { strapi }), /REDIS_URL/);
  const custom = await createConfiguredAdapter(() => function adapter() {}, { strapi });
  assert.equal(typeof custom.adapter, 'function');
});

test('adapter packages are optional peers loaded only when configured', () => {
  const source = readFileSync(new URL('../server/src/cluster/adapter.js', import.meta.url), 'utf8');
  assert.ok(!/^import .* from '(pg|ioredis|@socket\.io\/)/m.test(source), 'no static import of optional packages');
  assert.match(source, /npm install \$\{name\}/);
});

test('admin settings send the revision and offer a reload on 409', () => {
  const form = readFileSync(new URL('../admin/src/pages/Settings/useSettingsForm.js', import.meta.url), 'utf8');
  const dialog = readFileSync(new URL('../admin/src/pages/Settings/ConflictDialog.jsx', import.meta.url), 'utf8');
  assert.match(form, /revision: revisionRef\.current/);
  assert.match(form, /status === 409/);
  assert.match(dialog, /ConfirmDialog/);
  assert.match(dialog, /Dialog\.Cancel/);
});
