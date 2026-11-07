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

/** Builds an unsigned JWT-shaped string with the given payload (the stub verifier never checks it). */
const fakeJwt = (payload) => `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;

test('refresh mode: expiry is read from the token and a revoked session is refused (IO-RA-07)', async () => {
  const active = new Set(['s1']);
  const strapi = createStrapi({
    usersPermissions: {
      service: (name) =>
        name === 'jwt'
          ? { verify: async () => ({ id: 4, sessionId: 's1' }) }
          : { fetchAuthenticatedUser: async () => ({ id: 4, confirmed: true, blocked: false, role: { id: 2 } }) },
    },
    sessionManager: () => ({ isSessionActive: async (id) => active.has(id) }),
  });
  const { role } = strapi.plugin('io').service('strategy');
  const identity = await role.authenticate({ token: fakeJwt({ exp: 2_000_000_000 }) });
  assert.equal(identity.expiresAt, 2_000_000_000_000, 'exp taken from the token when verify omits it');
  assert.equal(identity.sessionId, 's1');
  active.delete('s1');
  await assert.rejects(role.authenticate({ token: fakeJwt({ exp: 2_000_000_000 }) }), { name: 'UnauthorizedError' });
});

test('user sockets are re-checked with one user query and one store read (IO-RA-08)', async () => {
  const strapi = createStrapi({
    usersPermissions: {
      service: (name) => (name === 'jwt' ? { verify: async (t) => ({ id: Number(t.split('.')[2]) }) } : {}),
    },
    users: [
      { id: 1, blocked: false, confirmed: true, role: { id: 2 } },
      { id: 2, blocked: true, confirmed: true, role: { id: 2 } },
      { id: 3, blocked: false, confirmed: true, role: { id: 1 } },
    ],
  });
  const { role } = strapi.plugin('io').service('strategy');
  const socket = (id, uid) => ({
    id,
    data: { role: { id: 2 } },
    handshake: { auth: { token: `h.${fakeJwt({}).split('.')[1]}.${uid}` } },
  });
  const sockets = [socket('a', 1), socket('b', 1), socket('c', 2), socket('d', 3), socket('e', 9)];
  strapi.state.queries.length = 0;
  const failed = await role.revalidateMany(sockets);
  assert.deepEqual([...failed].sort(), ['c', 'd', 'e'], 'blocked, role changed, deleted');
  const userQueries = strapi.state.queries.filter((q) => q.uid === 'plugin::users-permissions.user');
  assert.equal(userQueries.length, 1);
  assert.deepEqual(userQueries[0].where.id.$in.sort(), [1, 2, 3, 9]);
});
