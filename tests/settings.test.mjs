import assert from 'node:assert/strict';
import test from 'node:test';
import { errors } from '@strapi/utils';
import { DEFAULT_SETTINGS, normalizeSettings, settingsUpdateSchema } from '../server/src/utils/settings-schema.js';
import { createStrapi } from './helpers/strapi-stub.mjs';

test('normalizeSettings returns defaults for an empty store', () => {
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
});

test('version 1 documents are migrated: unimplemented keys dropped, old defaults that would now bite are reset', () => {
  const v1 = {
    enabled: true,
    cors: { origins: ['http://localhost:3000'] },
    connection: { maxConnections: 1000, pingTimeout: 20000, pingInterval: 25000, connectionTimeout: 45000 },
    security: {
      requireAuthentication: true,
      rateLimiting: { enabled: false, maxEventsPerSecond: 10 },
      ipWhitelist: [],
      ipBlacklist: ['10.0.0.0/8'],
    },
    events: { customEventNames: false, includeRelations: false, excludeFields: ['secretNote'], onlyPublished: false },
    redis: { enabled: true, url: 'redis://user:pass@cache:6379' },
    namespaces: { enabled: true, list: {} },
    monitoring: { enableConnectionLogging: true, enableEventLogging: true, maxEventLogSize: 100 },
    rolePermissions: { public: { canConnect: false, allowCredentials: true, contentTypes: {} } },
  };
  const result = normalizeSettings(v1);
  assert.equal(result.version, 2);
  assert.deepEqual(result.cors.origins, []);
  assert.equal(result.connection.maxConnections, 0);
  assert.equal(result.security.requireAuthentication, true);
  assert.deepEqual(result.security.ipBlacklist, ['10.0.0.0/8']);
  assert.equal(result.events.onlyPublished, true, 'drafts stay off by default');
  assert.deepEqual(result.events.excludeFields, ['secretNote']);
  assert.equal(result.monitoring.enableConnectionLogging, false);
  assert.equal(result.monitoring.enableEventLogging, true);
  assert.deepEqual(result.rolePermissions, { public: { canConnect: false } });
  assert.equal('redis' in result, false, 'Redis URL (with credentials) is not kept or returned');
  assert.equal('namespaces' in result, false);
});

test('invalid stored sections fall back to defaults without throwing', () => {
  const warnings = [];
  const result = normalizeSettings(
    { version: 2, connection: { maxConnections: -5 } },
    { warn: (m) => warnings.push(m) }
  );
  assert.deepEqual(result.connection, DEFAULT_SETTINGS.connection);
  assert.equal(warnings.length, 1);
});

test('PUT schema rejects unknown keys, wildcard origins, paths and out-of-range numbers', () => {
  const cases = [
    { redis: { url: 'redis://x' } },
    { cors: { origins: ['*'] } },
    { cors: { origins: ['https://app.example.com/path'] } },
    { cors: { origins: ['https://a.example', 'https://a.example'] } },
    { connection: { maxConnections: 10, pingTimeout: 10, pingInterval: 25000, connectionTimeout: 45000 } },
    {
      security: {
        requireAuthentication: true,
        rateLimiting: { enabled: true, maxEventsPerSecond: 10 },
        ipWhitelist: ['999.1.1.1'],
        ipBlacklist: [],
      },
    },
    { monitoring: { enableConnectionLogging: false, enableEventLogging: true, maxEventLogSize: 100000 } },
    { events: { onlyPublished: true, excludeFields: [], contentTypes: { 'api::article.article': ['explode'] } } },
  ];
  for (const body of cases) {
    assert.equal(settingsUpdateSchema.safeParse(body).success, false, JSON.stringify(body));
  }
  assert.equal(settingsUpdateSchema.safeParse({ cors: { origins: ['https://app.example.com'] } }).success, true);
});

test('setSettings deep-merges a partial update and keeps sibling values', async () => {
  const strapi = createStrapi();
  const service = strapi.plugin('io').service('settings');
  await service.setSettings({ security: { ...DEFAULT_SETTINGS.security, ipBlacklist: ['192.0.2.1'] } });
  const next = await service.setSettings({ presence: { enabled: false, showTypingIndicator: true } });
  assert.deepEqual(next.security.ipBlacklist, ['192.0.2.1']);
  assert.equal(next.presence.enabled, false);
  assert.equal(service.current().presence.enabled, false, 'snapshot updated without restart');
});

test("PUT /io/settings throws Strapi's own ValidationError (400) with field paths", async () => {
  const strapi = createStrapi();
  const controller = strapi.plugin('io').controller('settings');
  const ctx = { request: { body: { cors: { origins: ['nope'] }, extra: true } } };
  await assert.rejects(controller.updateSettings(ctx), (error) => {
    assert.ok(error instanceof errors.ValidationError, "same class Strapi's error middleware checks");
    assert.ok(error instanceof errors.ApplicationError);
    const paths = error.details.errors.map((e) => e.path.join('.'));
    assert.ok(paths.includes('cors.origins.0'));
    return true;
  });
});

test('PUT /io/settings rejects content types that do not exist', async () => {
  const strapi = createStrapi();
  const controller = strapi.plugin('io').controller('settings');
  const ctx = {
    request: {
      body: { events: { onlyPublished: true, excludeFields: [], contentTypes: { 'api::ghost.ghost': ['create'] } } },
    },
  };
  await assert.rejects(controller.updateSettings(ctx), errors.ValidationError);
});
