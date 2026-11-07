import assert from 'node:assert/strict';
import test from 'node:test';
import { startHost, nextEvent } from './helpers/socket-host.mjs';

const usersPermissions = { service: () => undefined };
const ack = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

/** Creates a session token like POST /io/presence/session. */
const session = (host, user, canRead = true) =>
  host.strapi
    .plugin('io')
    .service('presence')
    .createSessionToken(user, {
      can: (action, subject) =>
        canRead && action === 'plugin::content-manager.explorer.read' && subject === 'api::article.article',
    });

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
  const { token: aliceToken } = session(host, alice);
  const { socket: a } = await host.connect({ strategy: 'admin-jwt', token: aliceToken });
  const reused = await host.connect({ strategy: 'admin-jwt', token: aliceToken });
  assert.equal(reused.error.message, 'Authentication failed');

  const { socket: b } = await host.connect({ strategy: 'admin-jwt', token: session(host, bob).token });
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
  const { token } = session(host, { id: 3, firstname: 'C', lastname: 'D' }, false);
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
  const { socket } = await host.connect({ strategy: 'admin-jwt', token: session(host, { id: 1 }).token });
  const reply = await ack(socket, 'presence:join', { uid: 'api::article.article', documentId: 'abc' });
  assert.equal(reply.success, false);
  await host.close();
});
