import assert from 'node:assert/strict';
import test from 'node:test';
import { SanitizeError, removeFields } from '../server/src/services/sanitize.js';
import { createStrapi } from './helpers/strapi-stub.mjs';

test("output() fails closed when Strapi's sanitizer throws (#111 class of bugs)", async () => {
  const strapi = createStrapi({
    sanitizeOutput: async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'id')");
    },
  });
  const sanitize = strapi.plugin('io').service('sanitize');
  await assert.rejects(
    sanitize.output({ schema: { uid: 'api::article.article' }, data: { title: 'x', secretDraft: 'y' }, options: {} }),
    SanitizeError
  );
});

test('output() fails closed for unknown content types', async () => {
  const sanitize = createStrapi().plugin('io').service('sanitize');
  await assert.rejects(sanitize.output({ schema: { uid: 'api::nope.nope' }, data: {}, options: {} }), SanitizeError);
});

test('sensitive keys are matched exactly, so tokenCount and an upload hash survive', () => {
  const blocked = new Set(['password', 'salt', 'resetpasswordtoken']);
  const out = removeFields(
    {
      password: 'x',
      tokenCount: 3,
      image: { hash: 'abc', url: '/u.png' },
      nested: [{ ResetPasswordToken: 't', ok: 1 }],
    },
    blocked
  );
  assert.deepEqual(out, { tokenCount: 3, image: { hash: 'abc', url: '/u.png' }, nested: [{ ok: 1 }] });
});

test('settings excludeFields and config sensitiveFields are removed too', async () => {
  const strapi = createStrapi({ config: { sensitiveFields: ['ssn'] } });
  await strapi
    .plugin('io')
    .service('settings')
    .setSettings({
      events: { onlyPublished: true, excludeFields: ['internalNotes'], contentTypes: {} },
    });
  const sanitize = strapi.plugin('io').service('sanitize');
  const out = await sanitize.output({
    schema: { uid: 'api::article.article' },
    data: { title: 't', ssn: '1', internalNotes: 'n' },
    options: {},
  });
  assert.deepEqual(out, { title: 't' });
});
