import assert from 'node:assert/strict';
import test from 'node:test';
import { createDocumentEventsMiddleware, normalizePopulate } from '../server/src/bootstrap/document-events.js';
import { createStrapi } from './helpers/strapi-stub.mjs';

/** Builds a stub Strapi whose $io records calls. */
async function setup({ config = {}, settings, findOne } = {}) {
  const strapi = createStrapi({ config });
  await strapi.plugin('io').service('settings').load();
  if (settings) await strapi.plugin('io').service('settings').setSettings(settings);
  const calls = [];
  strapi.$io = {
    emit: async (args) => calls.push({ kind: 'emit', ...args }),
    emitIdentifier: async (args) => calls.push({ kind: 'id', ...args }),
  };
  const findOneCalls = [];
  strapi.documents = () => ({
    findOne: async (params) => {
      findOneCalls.push(params);
      return findOne ? findOne(params) : null;
    },
  });
  const middleware = createDocumentEventsMiddleware(strapi);
  const run = async (action, result) => {
    await middleware({ uid: 'api::article.article', action, params: {} }, async () => result);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { strapi, calls, run, findOneCalls };
}

test('publish emits article:publish with the published entry (not delete + create)', async () => {
  const { calls, run } = await setup({ config: { contentTypes: ['api::article.article'] } });
  await run('publish', {
    documentId: 'd1',
    entries: [{ id: 2, documentId: 'd1', locale: 'en', publishedAt: '2026-01-01' }],
  });
  assert.deepEqual(
    calls.map((c) => `${c.kind}:${c.event}`),
    ['emit:publish']
  );
});

test('draft saves are not emitted while "Only published content" is on', async () => {
  const { calls, run } = await setup({ config: { contentTypes: ['api::article.article'] } });
  await run('update', { id: 1, documentId: 'd1', publishedAt: null });
  await run('create', { id: 1, documentId: 'd1', publishedAt: null });
  assert.equal(calls.length, 0);
});

test('drafts are emitted when the setting is off', async () => {
  const { calls, run } = await setup({
    config: { contentTypes: ['api::article.article'] },
    settings: { events: { onlyPublished: false, excludeFields: [], contentTypes: {} } },
  });
  await run('update', { id: 1, documentId: 'd1', publishedAt: null });
  assert.deepEqual(
    calls.map((c) => c.event),
    ['update']
  );
});

test('delete emits one identifier event per locale, not per draft/published row', async () => {
  const { calls, run } = await setup({ config: { contentTypes: ['api::article.article'] } });
  await run('delete', {
    documentId: 'd1',
    entries: [
      { id: 1, documentId: 'd1', locale: 'en', publishedAt: null },
      { id: 2, documentId: 'd1', locale: 'en', publishedAt: '2026' },
      { id: 3, documentId: 'd1', locale: 'de', publishedAt: null },
    ],
  });
  assert.deepEqual(
    calls.map((c) => `${c.kind}:${c.event}:${c.data.locale}`),
    ['id:delete:en', 'id:delete:de']
  );
});

test('populate refetches the same locale and status instead of the default draft', async () => {
  const { findOneCalls, run } = await setup({
    config: { contentTypes: [{ uid: 'api::article.article', populate: ['author'] }] },
    findOne: (params) => ({ id: 9, documentId: params.documentId, author: { id: 1 } }),
  });
  await run('publish', { documentId: 'd1', entries: [{ id: 2, documentId: 'd1', locale: 'fr', publishedAt: '2026' }] });
  assert.deepEqual(findOneCalls[0], {
    documentId: 'd1',
    locale: 'fr',
    status: 'published',
    populate: { author: true },
  });
});

test('actions not configured are ignored; admin-selected content types are watched', async () => {
  const { calls, run } = await setup({
    config: { contentTypes: [{ uid: 'api::article.article', actions: ['delete'] }] },
  });
  await run('publish', { documentId: 'd1', entries: [{ documentId: 'd1', publishedAt: '2026' }] });
  assert.equal(calls.length, 0);

  const second = await setup({
    settings: {
      events: { onlyPublished: true, excludeFields: [], contentTypes: { 'api::article.article': ['unpublish'] } },
    },
  });
  await second.run('unpublish', { documentId: 'd1', entries: [{ documentId: 'd1', locale: null }] });
  assert.deepEqual(
    second.calls.map((c) => `${c.kind}:${c.event}`),
    ['id:unpublish']
  );
});

test('normalizePopulate supports *, true, arrays and objects', () => {
  assert.equal(normalizePopulate('*'), '*');
  assert.equal(normalizePopulate(true), '*');
  assert.deepEqual(normalizePopulate(['a', 'b']), { a: true, b: true });
  assert.deepEqual(normalizePopulate({ a: { fields: ['x'] } }), { a: { fields: ['x'] } });
  assert.equal(normalizePopulate(undefined), undefined);
});
