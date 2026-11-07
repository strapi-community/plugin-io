import assert from 'node:assert/strict';
import test from 'node:test';
import { errors } from '@strapi/utils';
import { validateTestEventName, withinLimits } from '../server/src/controllers/monitoring.js';
import { createStrapi } from './helpers/strapi-stub.mjs';

test('test event names: reserved, content and presence names are rejected', () => {
  const strapi = createStrapi();
  for (const name of ['connect', 'disconnect', 'error', 'article:update', 'presence:update', 'bad name', '']) {
    assert.ok(validateTestEventName(strapi, name), name);
  }
  assert.equal(validateTestEventName(strapi, 'test:ping'), null);
});

test('payload limits: depth and key count', () => {
  assert.equal(withinLimits({ a: { b: { c: 1 } } }), true);
  let deep = {};
  const root = deep;
  for (let i = 0; i < 12; i += 1) deep = deep.n = {};
  assert.equal(withinLimits(root), false);
});

test('sendTestEvent answers 400-style ValidationError for invalid names', async () => {
  const strapi = createStrapi();
  const controller = strapi.plugin('io').controller('monitoring');
  await assert.rejects(
    controller.sendTestEvent({ request: { body: { eventName: 'connect' } } }),
    errors.ValidationError
  );
});

test('stats are counts only and the event log is bounded and opt-in', async () => {
  const strapi = createStrapi();
  const settings = strapi.plugin('io').service('settings');
  await settings.load();
  const monitoring = strapi.plugin('io').service('monitoring');
  monitoring.recordEvent('article:create');
  assert.equal(monitoring.getEventLog(50).length, 0, 'log is off by default');
  await settings.setSettings({
    monitoring: { enableConnectionLogging: false, enableEventLogging: true, maxEventLogSize: 10 },
  });
  for (let i = 0; i < 25; i += 1) monitoring.recordEvent(`e${i}`);
  assert.equal(monitoring.getEventLog(500).length, 10);
  assert.equal(monitoring.getEventLog(-3).length, 1);
  const statsCtx = {};
  await strapi.plugin('io').controller('monitoring').getStats(statsCtx);
  assert.equal(statsCtx.body.data.events.totalEvents, 26);
  assert.deepEqual(Object.keys(statsCtx.body.data.connections), ['connected', 'rooms', 'byKind']);
  monitoring.reset();
  assert.equal(monitoring.getEventStats().totalEvents, 0);
});
