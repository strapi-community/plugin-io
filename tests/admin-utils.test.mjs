import assert from 'node:assert/strict';
import test from 'node:test';
import {
  changedSections,
  isEqual,
  isIpOrCidr,
  serverErrorsToFields,
  setIn,
  validateListEntry,
  validateSettings,
} from '../admin/src/utils/settings.mjs';
import { contentManagerPath, initials } from '../admin/src/utils/content-manager.mjs';
import { DEFAULT_SETTINGS } from '../server/src/utils/settings-schema.js';

test('client validation reports out-of-range values instead of clamping (0 stays a value)', () => {
  assert.deepEqual(validateSettings(structuredClone(DEFAULT_SETTINGS)), {});
  const draft = setIn(structuredClone(DEFAULT_SETTINGS), 'connection.pingTimeout', 10);
  assert.deepEqual(validateSettings(draft), { 'connection.pingTimeout': 'range' });
  assert.deepEqual(validateSettings(setIn(draft, 'connection.pingTimeout', undefined)), {
    'connection.pingTimeout': 'range',
  });
  assert.deepEqual(validateSettings(setIn(structuredClone(DEFAULT_SETTINGS), 'connection.maxConnections', 0)), {});
});

test('list entries: origins, IPs, duplicates', () => {
  assert.equal(validateListEntry('origin', 'https://app.example.com', []), null);
  assert.equal(validateListEntry('origin', 'https://app.example.com/', []), 'invalid');
  assert.equal(validateListEntry('origin', '*', []), 'invalid');
  assert.equal(validateListEntry('ip', '10.0.0.0/8', ['10.0.0.0/8']), 'duplicate');
  assert.equal(validateListEntry('ip', '', []), 'required');
  assert.equal(isIpOrCidr('2001:db8::/32'), true);
  assert.equal(isIpOrCidr('300.1.1.1'), false);
});

test('helpers', () => {
  assert.equal(isEqual({ a: 1, b: [1] }, { b: [1], a: 1 }), true);
  assert.deepEqual(changedSections({ version: 2, a: 1, b: 2 }, { version: 2, a: 1, b: 3 }), ['b']);
  assert.deepEqual(
    serverErrorsToFields({
      response: { data: { error: { details: { errors: [{ path: ['cors', 'origins', '0'], message: 'bad' }] } } } },
    }),
    { 'cors.origins.0': 'bad' }
  );
  assert.equal(
    contentManagerPath({ uid: 'api::a.a', documentId: 'x', kind: 'collectionType' }),
    '/content-manager/collection-types/api::a.a/x'
  );
  assert.equal(
    contentManagerPath({ uid: 'api::h.h', documentId: 'x', kind: 'singleType' }),
    '/content-manager/single-types/api::h.h'
  );
  assert.equal(initials({ firstname: 'ada', lastname: 'lovelace' }), 'AL');
  assert.equal(initials({}), '?');
});
