import assert from 'node:assert/strict';
import test from 'node:test';
import { nextEvent, startHost } from './helpers/socket-host.mjs';

const usersPermissions = { service: () => undefined };

/** Joins a raw client socket to an audience room on the server (as the handshake would). */
async function joinRoom(host, client, room) {
  const sockets = await host.strapi.$io.server.fetchSockets();
  sockets.find((s) => s.id === client.id).join(room);
}

test('content events reach rooms with find permission only (not create-only roles)', async () => {
  const host = await startHost({ usersPermissions });
  const { socket: publicClient } = await host.connect();
  const { socket: authClient } = await host.connect();
  await joinRoom(host, authClient, 'io-role-authenticated');
  const authSockets = await host.strapi.$io.server.fetchSockets();
  authSockets.find((s) => s.id === authClient.id).leave('io-role-public');

  const publicEvent = nextEvent(publicClient, 'article:publish');
  const authEvent = nextEvent(authClient, 'article:publish');
  const delivered = await host.strapi.$io.emit({
    event: 'publish',
    schema: { uid: 'api::article.article', singularName: 'article' },
    data: { id: 1, documentId: 'abc', title: 'Hello', publishedAt: '2026-01-01T00:00:00.000Z' },
  });
  assert.equal(delivered, 1);
  assert.deepEqual((await publicEvent).data.attributes.title, 'Hello');
  assert.equal(await authEvent, null, 'role with only create permission gets nothing');
  await host.close();
});

test('a room is skipped when sanitizing fails, nothing raw is emitted', async () => {
  const host = await startHost({
    usersPermissions,
    sanitizeOutput: async () => {
      throw new Error('boom');
    },
  });
  const { socket } = await host.connect();
  const received = nextEvent(socket, 'article:update');
  const delivered = await host.strapi.$io.emit({
    event: 'update',
    schema: { uid: 'api::article.article', singularName: 'article' },
    data: { id: 1, documentId: 'abc', title: 'secret' },
  });
  assert.equal(delivered, 0);
  assert.equal(await received, null);
  assert.ok(host.strapi.logs.warn.some((m) => m.includes('Skipped "article:update"')));
  assert.ok(!host.strapi.logs.warn.some((m) => m.includes('boom')), 'internal error text is not logged');
  await host.close();
});

test('delete events go only to readers and carry documentId and locale', async () => {
  const host = await startHost({
    usersPermissions,
    roles: [
      { id: 1, name: 'Public', type: 'public', permissions: [] },
      { id: 2, name: 'Readers', type: 'readers', permissions: [{ action: 'api::article.article.find' }] },
    ],
  });
  const { socket: anonymous } = await host.connect();
  const { socket: reader } = await host.connect();
  await joinRoom(host, reader, 'io-role-readers');
  const anonEvent = nextEvent(anonymous, 'article:delete');
  const readerEvent = nextEvent(reader, 'article:delete');
  await host.strapi.$io.emitIdentifier({
    event: 'delete',
    schema: { uid: 'api::article.article', singularName: 'article' },
    data: { documentId: 'abc', locale: 'en' },
  });
  assert.equal(await anonEvent, null);
  assert.deepEqual(await readerEvent, { data: { documentId: 'abc', locale: 'en' } });
  await host.close();
});

test('read-only and full-access API tokens receive events; admin-kind tokens are not audiences', async () => {
  const host = await startHost({
    usersPermissions,
    roles: [{ id: 1, name: 'Public', type: 'public', permissions: [] }],
    tokens: [
      { id: 7, name: 'Reader', type: 'read-only', kind: 'content-api', permissions: [] },
      { id: 8, name: 'Admin token', type: 'full-access', kind: 'admin', permissions: [] },
    ],
  });
  const audiences = await host.strapi.plugin('io').service('rooms').getAudiences();
  assert.deepEqual(
    audiences.map((a) => a.name),
    ['io-role-public', 'io-token-7']
  );
  await host.close();
});
