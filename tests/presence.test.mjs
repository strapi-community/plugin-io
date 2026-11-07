import assert from 'node:assert/strict';
import test from 'node:test';
import { startHost, nextEvent } from './helpers/socket-host.mjs';

const usersPermissions = { service: () => undefined };
const ack = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

const READ = { action: 'plugin::content-manager.explorer.read' };

/**
 * Registers an active admin in the stub database and creates a session token
 * like POST /io/presence/session.
 */
const session = async (host, user, canRead = true, sessionId = null) => {
  const admins = host.strapi.state.admins;
  const index = admins.findIndex((a) => a.id === user.id);
  const row = { ...user, isActive: true, blocked: false, permissions: canRead ? [READ] : [] };
  if (index >= 0) admins[index] = row;
  else admins.push(row);
  return host.strapi.plugin('io').service('presence').createSessionToken(user, { sessionId });
};

test('anonymous sockets cannot join presence rooms or see admins', async () => {
  const host = await startHost({ usersPermissions });
  const { socket } = await host.connect();
  const reply = await Promise.race([
    ack(socket, 'presence:join', { uid: 'api::article.article', documentId: 'abc' }),
    new Promise((resolve) => setTimeout(() => resolve('no-reply'), 300)),
  ]);
  assert.equal(reply, 'no-reply', 'handler is not even registered for non-admin sockets');
  await host.close();
});

test('admins see each other without emails; one-time tokens cannot be reused', async () => {
  const host = await startHost({ usersPermissions });
  const alice = { id: 1, firstname: 'Ada', lastname: 'Example', email: 'ada@example.test' };
  const bob = { id: 2, firstname: 'Bo', lastname: 'Sample', email: 'bo@example.test' };
  const { token: aliceToken } = await session(host, alice);
  const { socket: a } = await host.connect({ strategy: 'admin-jwt', token: aliceToken });
  const reused = await host.connect({ strategy: 'admin-jwt', token: aliceToken });
  assert.equal(reused.error.message, 'Authentication failed');

  const { socket: b } = await host.connect({ strategy: 'admin-jwt', token: (await session(host, bob)).token });
  await ack(a, 'presence:join', { uid: 'api::article.article', documentId: 'abc', entryTitle: '<img>' });
  const update = nextEvent(a, 'presence:update');
  const reply = await ack(b, 'presence:join', { uid: 'api::article.article', documentId: 'abc' });
  assert.equal(reply.success, true);
  const payload = await update;
  assert.deepEqual(
    payload.editors.map(({ id, firstname, lastname }) => ({ id, firstname, lastname })).sort((x, y) => x.id - y.id),
    [
      { id: 1, firstname: 'Ada', lastname: 'Example' },
      { id: 2, firstname: 'Bo', lastname: 'Sample' },
    ]
  );
  assert.ok(!JSON.stringify(payload).includes('example.test'), 'no email');
  assert.ok(!JSON.stringify(payload).includes('socketId'), 'no socket ids');
  await host.close();
});

test('admins without Content Manager read permission cannot join', async () => {
  const host = await startHost({ usersPermissions });
  const { token } = await session(host, { id: 3, firstname: 'C', lastname: 'D' }, false);
  const { socket } = await host.connect({ strategy: 'admin-jwt', token });
  const reply = await ack(socket, 'presence:join', { uid: 'api::article.article', documentId: 'abc' });
  assert.equal(reply.success, false);
  await host.close();
});

test('presence can be turned off in the settings', async () => {
  const host = await startHost({
    usersPermissions,
    settings: { presence: { enabled: false, showTypingIndicator: true } },
  });
  const { socket } = await host.connect({ strategy: 'admin-jwt', token: (await session(host, { id: 1 })).token });
  const reply = await ack(socket, 'presence:join', { uid: 'api::article.article', documentId: 'abc' });
  assert.equal(reply.success, false);
  await host.close();
});

test('one admin holds at most five unused tokens; the oldest are dropped (IO-RA-01)', async () => {
  const host = await startHost({ usersPermissions });
  const presence = host.strapi.plugin('io').service('presence');
  const tokens = [];
  for (let i = 0; i < 7; i += 1) tokens.push((await session(host, { id: 9 })).token);
  assert.equal(await presence.size(9), 5);
  assert.equal(await presence.consumeSessionToken(tokens[0]), null, 'oldest dropped');
  assert.equal(await presence.consumeSessionToken(tokens[1]), null, 'second oldest dropped');
  const consumed = await presence.consumeSessionToken(tokens[6]);
  assert.deepEqual(Object.keys(consumed).sort(), ['sessionId', 'user'], 'no ability object is stored');
  await host.close();
});

test('the route answers 429 once 10,000 tokens are pending (IO-RA-01)', async () => {
  const host = await startHost({ usersPermissions });
  const presence = host.strapi.plugin('io').service('presence');
  for (let id = 1; id <= 2000; id += 1) {
    for (let i = 0; i < 5; i += 1) await presence.createSessionToken({ id });
  }
  assert.equal(await presence.size(), 10_000);
  assert.equal(await presence.createSessionToken({ id: 5000 }), null);
  let status = null;
  const ctx = {
    state: { user: { id: 5000 }, session: { id: 's' } },
    tooManyRequests: (message) => {
      status = 429;
      return message;
    },
  };
  await host.strapi.plugin('io').controller('presence').createSession(ctx);
  assert.equal(status, 429);
  assert.equal(ctx.body, undefined);
  // An admin who already holds tokens can still rotate them.
  assert.ok(await presence.createSessionToken({ id: 1 }));
  await host.close();
});

test('admin sockets keep their identity under data.admin, never data.user (IO-RA-04)', async () => {
  const seen = [];
  const host = await startHost({
    usersPermissions,
    config: {
      events: [
        { name: 'whoami', handler: (_ctx, socket, ...args) => args.at(-1)?.({ kind: socket.data.kind }) },
        { name: 'connection', handler: (_ctx, socket) => seen.push(socket.data.kind) },
        { name: 'admin-ok', admin: true, handler: (_ctx, socket, ...args) => args.at(-1)?.(socket.data.admin.id) },
      ],
    },
  });
  const { socket } = await host.connect({
    strategy: 'admin-jwt',
    token: (await session(host, { id: 4, firstname: 'A' })).token,
  });
  const [server] = await host.strapi.$io.server.fetchSockets();
  assert.equal(server.data.user, undefined);
  assert.equal(server.data.admin.id, 4);
  const reply = await Promise.race([
    ack(socket, 'whoami'),
    new Promise((resolve) => setTimeout(() => resolve('no-reply'), 300)),
  ]);
  assert.equal(reply, 'no-reply', 'config.events skip admin sockets by default');
  assert.deepEqual(seen, [], 'connection handlers skip admin sockets by default');
  assert.equal(await ack(socket, 'admin-ok'), 4, 'events with admin: true still run');
  await host.close();
});

test('a revoked Strapi session cannot connect and drops connected sockets (IO-RA-07)', async () => {
  const active = new Set(['sess-1', 'sess-2']);
  const sessionManager = () => ({ isSessionActive: async (id) => active.has(id) });
  const host = await startHost({ usersPermissions, sessionManager });
  active.delete('sess-2');
  const refused = await host.connect({
    strategy: 'admin-jwt',
    token: (await session(host, { id: 1 }, true, 'sess-2')).token,
  });
  assert.equal(refused.error?.message, 'Authentication failed');

  const { socket } = await host.connect({
    strategy: 'admin-jwt',
    token: (await session(host, { id: 1 }, true, 'sess-1')).token,
  });
  assert.equal(socket.connected, true);
  assert.equal(await host.strapi.$io.revalidateSockets(['admin']), 0);
  active.delete('sess-1');
  const gone = nextEvent(socket, 'disconnect', 1000);
  assert.equal(await host.strapi.$io.revalidateSockets(['admin']), 1);
  assert.equal(await gone, 'io server disconnect');
  await host.close();
});

test('deleting a Strapi session re-checks that admin right away (IO-RA-07)', async () => {
  const { registerInvalidation } = await import('../server/src/bootstrap/invalidation.js');
  const active = new Set(['sess-1']);
  const host = await startHost({
    usersPermissions,
    sessionManager: () => ({ isSessionActive: async (id) => active.has(id) }),
  });
  const subscribers = [];
  host.strapi.db.lifecycles.subscribe = (subscriber) => subscribers.push(subscriber);
  registerInvalidation({ strapi: host.strapi });
  const { socket } = await host.connect({
    strategy: 'admin-jwt',
    token: (await session(host, { id: 1 }, true, 'sess-1')).token,
  });
  const sessionsSub = subscribers.find((s) => s.models.includes('admin::session'));
  const gone = nextEvent(socket, 'disconnect', 1500);
  active.delete('sess-1');
  sessionsSub.afterDeleteMany({ action: 'afterDeleteMany', params: { where: { userId: '1', origin: 'admin' } } });
  assert.equal(await gone, 'io server disconnect');
  await host.close();
});

test('revalidation reloads the ability and drops admins who lost read access to a joined entry (IO-RA-07)', async () => {
  const host = await startHost({ usersPermissions });
  const { socket } = await host.connect({ strategy: 'admin-jwt', token: (await session(host, { id: 2 })).token });
  assert.equal((await ack(socket, 'presence:join', { uid: 'api::article.article', documentId: 'abc' })).success, true);
  host.strapi.state.admins.find((a) => a.id === 2).permissions = [];
  const gone = nextEvent(socket, 'disconnect', 1000);
  assert.equal(await host.strapi.$io.revalidateSockets(['admin']), 1);
  assert.equal(await gone, 'io server disconnect');
  await host.close();
});

test('deactivated admins are refused at the handshake', async () => {
  const host = await startHost({ usersPermissions });
  const { token } = await session(host, { id: 6 });
  host.strapi.state.admins.find((a) => a.id === 6).isActive = false;
  const { error } = await host.connect({ strategy: 'admin-jwt', token });
  assert.equal(error?.message, 'Authentication failed');
  await host.close();
});
