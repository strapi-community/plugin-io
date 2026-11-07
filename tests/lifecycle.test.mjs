import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import plugin from '../server/src/index.js';
import { createStrapi } from './helpers/strapi-stub.mjs';

const resources = () =>
  process
    .getActiveResourcesInfo()
    .filter((r) => r !== 'TTYWrap')
    .sort();

test('bootstrap registers permissions and the document middleware; destroy leaves no handles (#109)', async () => {
  const before = resources();
  // Like `strapi ts:generate-types`: the HTTP server exists but never listens.
  const httpServer = createServer();
  const strapi = createStrapi({ httpServer });
  const registered = [];
  const middlewares = [];
  strapi.admin = { services: { permission: { actionProvider: { registerMany: async (a) => registered.push(...a) } } } };
  strapi.documents = Object.assign(() => ({}), { use: (fn) => middlewares.push(fn) });

  await plugin.bootstrap({ strapi });
  assert.deepEqual(
    registered.map((a) => a.uid),
    ['settings.read', 'settings.update', 'monitoring.read', 'monitoring.manage']
  );
  assert.equal(middlewares.length, 1);
  assert.ok(strapi.$io.server);

  await plugin.destroy({ strapi });
  assert.equal(strapi.logs.error.length, 0, strapi.logs.error.join('\n'));
  assert.equal(strapi.logs.warn.filter((m) => m.includes('closing')).length, 0);
  assert.deepEqual(resources(), before, 'no timers or sockets keep the process alive');
});

test('hooks.init errors are logged instead of crashing bootstrap', async () => {
  const strapi = createStrapi({
    httpServer: createServer(),
    config: { hooks: { init: () => Promise.reject(new Error('redis down')) } },
  });
  strapi.admin = { services: { permission: { actionProvider: { registerMany: async () => {} } } } };
  strapi.documents = Object.assign(() => ({}), { use: () => {} });
  await plugin.bootstrap({ strapi });
  assert.ok(strapi.logs.error.some((m) => m.includes('hooks.init failed')));
  await plugin.destroy({ strapi });
});

test('hooks.init gets { strapi, $io, io } and its middleware runs before the plugin handshake (IO-RA-03)', async () => {
  const { startHost } = await import('./helpers/socket-host.mjs');
  const order = [];
  let context = null;
  const host = await startHost({
    usersPermissions: { service: () => undefined },
    config: {
      hooks: {
        init: ({ strapi, $io, io }) => {
          context = { strapi: Boolean(strapi), same: $io === io, server: Boolean(io.server) };
          io.server.use((socket, next) => {
            order.push(socket.data.kind ?? 'before-handshake');
            next();
          });
        },
      },
    },
  });
  const { error } = await host.connect();
  assert.equal(error, undefined);
  assert.deepEqual(context, { strapi: true, same: true, server: true });
  assert.deepEqual(order, ['before-handshake']);
  assert.equal(host.strapi.logs.error.length, 0, host.strapi.logs.error.join('\n'));
  await host.close();
});
