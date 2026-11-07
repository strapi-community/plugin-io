import assert from 'node:assert/strict';
import test from 'node:test';
import { isReadScope } from '../server/src/services/strategies.js';
import { createStrapi } from './helpers/strapi-stub.mjs';

test('isReadScope is defined and matches find/findOne only (#F-09)', () => {
  assert.equal(isReadScope('api::a.a.find'), true);
  assert.equal(isReadScope('api::a.a.findOne'), true);
  assert.equal(isReadScope('api::a.a.create'), false);
});

test('read-only token verify allows read scopes and rejects writes', () => {
  const { token } = createStrapi().plugin('io').service('strategy');
  const auth = { credentials: { type: 'read-only', expiresAt: null } };
  assert.doesNotThrow(() => token.verify(auth, { scope: ['api::a.a.find'] }));
  assert.throws(() => token.verify(auth, { scope: ['api::a.a.create'] }));
});

test('the jwt strategy fails cleanly without users-permissions and with an empty advanced store', async () => {
  const strapi = createStrapi();
  const { role } = strapi.plugin('io').service('strategy');
  await assert.rejects(role.authenticate({ token: 'x' }), { name: 'UnauthorizedError' });

  const withUp = createStrapi({
    usersPermissions: {
      service: (name) =>
        name === 'jwt'
          ? { verify: async () => ({ id: 4, exp: 2_000_000_000 }) }
          : { fetchAuthenticatedUser: async () => ({ id: 4, confirmed: true, blocked: false, role: { id: 2 } }) },
    },
  });
  const identity = await withUp.plugin('io').service('strategy').role.authenticate({ token: 'jwt' });
  assert.equal(identity.role.type, 'authenticated');
  assert.equal(identity.expiresAt, 2_000_000_000_000);
  assert.equal(withUp.plugin('io').service('strategy').role.getRoomName(identity.role), 'io-role-authenticated');
});

test('blocked users are rejected', async () => {
  const strapi = createStrapi({
    usersPermissions: {
      service: (name) =>
        name === 'jwt'
          ? { verify: async () => ({ id: 4 }) }
          : { fetchAuthenticatedUser: async () => ({ id: 4, blocked: true, role: { id: 2 } }) },
    },
  });
  await assert.rejects(strapi.plugin('io').service('strategy').role.authenticate({ token: 'jwt' }));
});
