import assert from 'node:assert/strict';
import test from 'node:test';
import { batch, changedIds, registerInvalidation } from '../server/src/bootstrap/invalidation.js';
import { startHost } from './helpers/socket-host.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('changedIds reads result and where ids, and returns null for bulk events', () => {
  assert.deepEqual(changedIds({ action: 'afterUpdate', params: { where: { id: 4 } }, result: { id: 4 } }), [4]);
  assert.deepEqual(changedIds({ action: 'afterDelete', params: {}, result: { id: 9 } }), [9]);
  assert.equal(changedIds({ action: 'afterUpdateMany', params: { where: { role: 2 } }, result: { count: 3 } }), null);
  assert.equal(changedIds({ action: 'afterDeleteMany', params: {}, result: { count: 1 } }), null);
  assert.equal(changedIds({ action: 'afterUpdate', params: { where: { email: 'x' } }, result: null }), null);
});

test('batch merges ids inside the window and widens to all on null', async () => {
  const runs = [];
  const schedule = batch((ids) => runs.push(ids), 20);
  schedule([1]);
  schedule([2, 1]);
  await sleep(40);
  schedule([3]);
  schedule(null);
  await sleep(40);
  assert.deepEqual(runs, [[1, 2], null]);
});

/**
 * Starts a host with three token sockets (ids 1, 2, 3) and a counting
 * revalidate that rejects token 2.
 */
async function hostWithTokenSockets() {
  const host = await startHost({ usersPermissions: { service: () => undefined } });
  const clients = [];
  for (let i = 0; i < 3; i += 1) clients.push((await host.connect()).socket);
  for (const [index, socket] of (await host.strapi.$io.server.fetchSockets()).entries()) {
    socket.data.kind = 'token';
    socket.data.token = { id: index + 1, type: 'read-only' };
  }
  const calls = [];
  const strategy = host.strapi.plugin('io').service('strategy');
  strategy.token.revalidateMany = async (sockets) => {
    for (const socket of sockets) calls.push(socket.data.token.id);
    return new Set(sockets.filter((socket) => socket.data.token.id === 2).map((socket) => socket.id));
  };
  return { host, clients, calls };
}

test('revalidateSockets with ids only re-checks those identities', async () => {
  const { host, calls } = await hostWithTokenSockets();
  assert.equal(await host.strapi.$io.revalidateSockets(['token'], { ids: [2] }), 1);
  assert.deepEqual(calls, [2]);
  calls.length = 0;
  assert.equal(await host.strapi.$io.revalidateSockets(['token']), 0);
  assert.deepEqual(calls.sort(), [1, 3]);
  await host.close();
});

test('lifecycle hooks re-check only the changed rows and skip creates and lastUsedAt updates', async () => {
  const { host, calls } = await hostWithTokenSockets();
  const subscribers = [];
  host.strapi.db.lifecycles.subscribe = (subscriber) => subscribers.push(subscriber);
  let invalidations = 0;
  const rooms = host.strapi.plugin('io').service('rooms');
  const originalInvalidate = rooms.invalidate;
  rooms.invalidate = () => {
    invalidations += 1;
    originalInvalidate();
  };
  registerInvalidation({ strapi: host.strapi });
  const tokens = subscribers.find((s) => s.models.includes('admin::api-token'));
  const roles = subscribers.find((s) => s.models.includes('plugin::users-permissions.role'));

  tokens.afterUpdate({
    action: 'afterUpdate',
    params: { where: { id: 1 }, data: { lastUsedAt: new Date() } },
    result: { id: 1 },
  });
  tokens.afterCreate({ action: 'afterCreate', params: { data: { name: 'new' } }, result: { id: 9 } });
  await sleep(350);
  assert.deepEqual(calls, [], 'lastUsedAt and create do not re-check sockets');
  assert.equal(invalidations, 1, 'create clears the audience cache, lastUsedAt does not');

  tokens.afterDelete({ action: 'afterDelete', params: { where: { id: 3 } }, result: { id: 3 } });
  await sleep(350);
  assert.deepEqual(calls, [3], 'only the deleted token is re-checked');

  calls.length = 0;
  roles.afterUpdate({ action: 'afterUpdate', params: { where: { id: 1 } }, result: { id: 1 } });
  await sleep(350);
  assert.deepEqual(calls, [], 'role changes only clear the audience cache');
  assert.equal(invalidations, 3);

  tokens.afterDeleteMany({ action: 'afterDeleteMany', params: {}, result: { count: 2 } });
  await sleep(350);
  assert.deepEqual(calls.sort(), [1, 2, 3], 'bulk changes re-check every token socket');
  await host.close();
});

test('token sockets are re-checked with one query for all tokens (IO-RA-08)', async () => {
  const host = await startHost({
    usersPermissions: { service: () => undefined },
    tokens: [
      { id: 1, expiresAt: null },
      { id: 2, expiresAt: new Date(Date.now() - 1000).toISOString() },
    ],
  });
  for (let i = 0; i < 4; i += 1) await host.connect();
  for (const [index, socket] of (await host.strapi.$io.server.fetchSockets()).entries()) {
    socket.data.kind = 'token';
    socket.data.token = { id: (index % 3) + 1, type: 'read-only' };
  }
  host.strapi.state.queries.length = 0;
  // ids 1, 2, 3, 1: token 2 expired, token 3 deleted
  assert.equal(await host.strapi.$io.revalidateSockets(['token']), 2);
  const tokenQueries = host.strapi.state.queries.filter((q) => q.uid === 'admin::api-token');
  assert.equal(tokenQueries.length, 1);
  assert.deepEqual(tokenQueries[0].where.id.$in.sort(), [1, 2, 3]);
  await host.close();
});

test('session deletes map to the right kind and user', async () => {
  const { sessionTarget } = await import('../server/src/bootstrap/invalidation.js');
  assert.deepEqual(sessionTarget({ params: { where: { userId: '3', origin: 'admin' } } }), {
    origin: 'admin',
    userId: '3',
  });
  assert.deepEqual(sessionTarget({ params: { where: { sessionId: 'x' } }, result: { count: 1 } }), {
    origin: null,
    userId: null,
  });
});
