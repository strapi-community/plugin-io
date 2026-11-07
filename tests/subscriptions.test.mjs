import assert from 'node:assert/strict';
import test from 'node:test';
import { createDocumentEventsMiddleware } from '../server/src/bootstrap/document-events.js';
import { ERRORS, entityRoom, parseEntityRoom, parseTarget } from '../server/src/services/subscriptions.js';
import { nextEvent, startHost } from './helpers/socket-host.mjs';
import { createStrapi } from './helpers/strapi-stub.mjs';

const usersPermissions = { service: () => undefined };
const ARTICLE = { uid: 'api::article.article', singularName: 'article' };
const documents = [
  { uid: 'api::article.article', documentId: 'doc-published', publishedAt: '2026-01-01T00:00:00.000Z' },
  { uid: 'api::article.article', documentId: 'doc-draft', publishedAt: null },
  { uid: 'api::article.article', documentId: 'doc-other', publishedAt: '2026-01-01T00:00:00.000Z' },
];
const enabled = { subscriptions: { enabled: true, maxPerSocket: 2 } };

/** Emits an ack event and resolves with the reply. */
const ask = (socket, event, ...args) => new Promise((resolve) => socket.emit(event, ...args, resolve));

/** Starts a host with the public role allowed to read articles. */
const start = (options = {}) => startHost({ usersPermissions, documents, settings: enabled, ...options });

test('room names carry the audience and parse back; payload parsing is strict', () => {
  const room = entityRoom('io-role-public', 'api::article.article', 'abc');
  assert.equal(room, 'io-entity-io-role-public|api::article.article|abc');
  assert.deepEqual(parseEntityRoom(room), {
    audience: 'io-role-public',
    uid: 'api::article.article',
    documentId: 'abc',
  });
  assert.equal(parseEntityRoom('io-role-public'), null);
  assert.deepEqual(parseTarget({ uid: 'api::article.article', id: 'abc' }), {
    uid: 'api::article.article',
    documentId: 'abc',
  });
  for (const bad of [
    null,
    'x',
    { uid: 'api::article.article' },
    { uid: 'plugin::users-permissions.user', documentId: 'a' },
    { uid: 'api::article.article', documentId: 7 },
    { uid: 'api::article.article', documentId: 'a|b' },
    { uid: 'api::article.article', documentId: 'x'.repeat(65) },
    { uid: 'api::article.article', documentId: { $ne: null } },
  ]) {
    assert.equal(parseTarget(bad), null, JSON.stringify(bad));
  }
});

test('subscriptions are off by default', async () => {
  const host = await start({ settings: undefined });
  const { socket } = await host.connect();
  const reply = await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' });
  assert.deepEqual(reply, { success: false, error: ERRORS.DISABLED });
  await host.close();
});

test('a reader subscribes and receives events of a type that is not broadcast; others do not', async () => {
  const host = await start();
  const { socket: follower } = await host.connect();
  const { socket: bystander } = await host.connect();

  const reply = await ask(follower, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' });
  assert.deepEqual(reply, { success: true, uid: ARTICLE.uid, documentId: 'doc-published', id: 'doc-published' });
  // 5.x payload shape `{ uid, id }` is accepted too and is idempotent.
  assert.equal((await ask(follower, 'subscribe-entity', { uid: ARTICLE.uid, id: 'doc-published' })).success, true);
  assert.deepEqual(await ask(follower, 'get-entity-subscriptions'), {
    success: true,
    subscriptions: [{ uid: ARTICLE.uid, documentId: 'doc-published', id: 'doc-published' }],
  });
  assert.equal(host.strapi.plugin('io').service('subscriptions').hasSubscribers(ARTICLE.uid, ['doc-published']), true);

  const got = nextEvent(follower, 'article:update');
  const missed = nextEvent(bystander, 'article:update');
  const delivered = await host.strapi.$io.emit({
    event: 'update',
    schema: ARTICLE,
    data: { id: 1, documentId: 'doc-published', title: 'Hello' },
    broadcast: false,
  });
  assert.equal(delivered, 1);
  assert.equal((await got).data.attributes.title, 'Hello');
  assert.equal(await missed, null, 'the audience room is not used when the type is not broadcast');

  const otherDoc = nextEvent(follower, 'article:update');
  await host.strapi.$io.emit({
    event: 'update',
    schema: ARTICLE,
    data: { id: 3, documentId: 'doc-other', title: 'Other' },
    broadcast: false,
  });
  assert.equal(await otherDoc, null, 'only the followed document');

  const deleted = nextEvent(follower, 'article:delete');
  await host.strapi.$io.emitIdentifier({
    event: 'delete',
    schema: ARTICLE,
    data: { documentId: 'doc-published', locale: 'en' },
    broadcast: false,
  });
  assert.deepEqual(await deleted, { data: { documentId: 'doc-published', locale: 'en' } });

  assert.deepEqual(await ask(follower, 'unsubscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' }), {
    success: true,
    uid: ARTICLE.uid,
    documentId: 'doc-published',
    id: 'doc-published',
  });
  assert.equal(host.strapi.plugin('io').service('subscriptions').hasSubscribers(ARTICLE.uid, ['doc-published']), false);
  await host.close();
});

test('a socket in the audience room and the entity room receives a broadcast event once', async () => {
  const host = await start();
  const { socket } = await host.connect();
  await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' });
  const received = [];
  socket.on('article:update', (payload) => received.push(payload));
  await host.strapi.$io.emit({ event: 'update', schema: ARTICLE, data: { id: 1, documentId: 'doc-published' } });
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.equal(received.length, 1);
  await host.close();
});

test('subscribing needs read permission; unknown types get the same answer', async () => {
  const host = await start({
    roles: [{ id: 1, name: 'Public', type: 'public', permissions: [{ action: 'api::article.article.create' }] }],
  });
  const { socket } = await host.connect();
  assert.deepEqual(await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' }), {
    success: false,
    error: ERRORS.NOT_ALLOWED,
  });
  assert.deepEqual(await ask(socket, 'subscribe-entity', { uid: 'api::missing.missing', documentId: 'x' }), {
    success: false,
    error: ERRORS.NOT_ALLOWED,
  });
  assert.deepEqual(await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid }), {
    success: false,
    error: ERRORS.INVALID,
  });
  await host.close();
});

test('drafts cannot be followed while "Only published content" is on; missing documents are rejected', async () => {
  const host = await start();
  const { socket } = await host.connect();
  for (const documentId of ['doc-draft', 'doc-missing']) {
    assert.deepEqual(await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId }), {
      success: false,
      error: ERRORS.NOT_FOUND,
    });
  }
  await host.strapi
    .plugin('io')
    .service('settings')
    .setSettings({
      events: { onlyPublished: false, excludeFields: [], contentTypes: {} },
    });
  assert.equal((await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-draft' })).success, true);
  await host.close();
});

test('the per-socket limit is enforced', async () => {
  const host = await start();
  const { socket } = await host.connect();
  assert.equal(
    (await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' })).success,
    true
  );
  assert.equal((await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-other' })).success, true);
  assert.deepEqual(await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-draft' }), {
    success: false,
    error: 'Maximum subscriptions (2) reached',
  });
  await host.close();
});

test('subscriptions are removed when the socket disconnects', async () => {
  const host = await start();
  const { socket } = await host.connect();
  await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' });
  const service = host.strapi.plugin('io').service('subscriptions');
  assert.equal(service.hasSubscribers(ARTICLE.uid, ['doc-published']), true);
  socket.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(service.hasSubscribers(ARTICLE.uid, ['doc-published']), false);
  await host.close();
});

test('payloads are sanitized per audience and dropped when read permission is revoked', async () => {
  const host = await start({
    sanitizeOutput: async (data) => {
      const { internalNote: _drop, ...rest } = data;
      return rest;
    },
  });
  const { socket } = await host.connect();
  await ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' });

  const first = nextEvent(socket, 'article:update');
  await host.strapi.$io.emit({
    event: 'update',
    schema: ARTICLE,
    data: { id: 1, documentId: 'doc-published', title: 'T', internalNote: 'hidden', secret: 'x' },
    broadcast: false,
  });
  const { attributes } = (await first).data;
  assert.equal(attributes.title, 'T');
  assert.equal(attributes.internalNote, undefined, 'Content API sanitizer applied');
  assert.equal(attributes.secret, undefined, 'sensitive keys removed');

  host.strapi.state.roles[0].permissions = [];
  host.strapi.plugin('io').service('rooms').invalidate();
  const second = nextEvent(socket, 'article:update');
  const delivered = await host.strapi.$io.emit({
    event: 'update',
    schema: ARTICLE,
    data: { id: 1, documentId: 'doc-published', title: 'T2' },
    broadcast: false,
  });
  assert.equal(delivered, 0);
  assert.equal(await second, null);
  await host.close();
});

test('entity rooms are reserved: joinRoom cannot put a socket into one', async () => {
  const host = await start();
  const { socket } = await host.connect();
  const room = entityRoom('io-role-public', ARTICLE.uid, 'doc-published');
  assert.equal(host.strapi.$io.joinRoom(socket.id, room), false);
  assert.equal(host.strapi.plugin('io').service('subscriptions').hasSubscribers(ARTICLE.uid, ['doc-published']), false);
  await host.close();
});

test('server helpers use the same checks', async () => {
  const host = await start();
  const { socket } = await host.connect();
  assert.deepEqual(await host.strapi.$io.subscribeToEntity('nope', ARTICLE.uid, 'doc-published'), {
    success: false,
    error: 'Socket not found',
  });
  assert.equal(
    (await host.strapi.$io.subscribeToEntity(socket.id, ARTICLE.uid, 'doc-missing')).error,
    ERRORS.NOT_FOUND
  );
  assert.equal((await host.strapi.$io.subscribeToEntity(socket.id, ARTICLE.uid, 'doc-published')).success, true);
  assert.equal(host.strapi.$io.getEntitySubscriptions(socket.id).subscriptions.length, 1);
  assert.equal(host.strapi.$io.unsubscribeFromEntity(socket.id, ARTICLE.uid, 'doc-published').success, true);
  assert.equal(host.strapi.$io.getEntitySubscriptions(socket.id).subscriptions.length, 0);
  await host.close();
});

test('admin sockets cannot subscribe', async () => {
  const strapi = createStrapi({ documents });
  await strapi.plugin('io').service('settings').load();
  await strapi.plugin('io').service('settings').setSettings(enabled);
  const fakeSocket = { data: { kind: 'admin', admin: { id: 1 } }, rooms: new Set(), connected: true, join() {} };
  assert.deepEqual(
    await strapi
      .plugin('io')
      .service('subscriptions')
      .subscribe(fakeSocket, { uid: ARTICLE.uid, documentId: 'doc-published' }),
    { success: false, error: ERRORS.NOT_ALLOWED }
  );
});

test('subscribe requests are rate limited per socket', async () => {
  const host = await start({ settings: { subscriptions: { enabled: true, maxPerSocket: 1000 } } });
  const { socket } = await host.connect();
  const replies = await Promise.all(
    Array.from({ length: 15 }, () => ask(socket, 'subscribe-entity', { uid: ARTICLE.uid, documentId: 'doc-published' }))
  );
  assert.ok(replies.some((r) => r.error === ERRORS.RATE));
  await host.close();
});

/** Stub with a recording $io and a configurable subscriber check. */
async function middlewareSetup({ subscribed, config = {} }) {
  const strapi = createStrapi({ config, documents });
  await strapi.plugin('io').service('settings').load();
  await strapi.plugin('io').service('settings').setSettings(enabled);
  const calls = [];
  strapi.$io = {
    emit: async (args) => calls.push({ kind: 'emit', ...args }),
    emitIdentifier: async (args) => calls.push({ kind: 'id', ...args }),
  };
  const service = strapi.plugin('io').service('subscriptions');
  service.hasSubscribers = (uid, ids) => ids.some((id) => subscribed.includes(id));
  const middleware = createDocumentEventsMiddleware(strapi);
  const run = async (action, result) => {
    await middleware({ uid: ARTICLE.uid, action, params: {} }, async () => result);
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { calls, run, strapi };
}

test('document events of a type that is not broadcast reach subscribers only', async () => {
  const { calls, run } = await middlewareSetup({ subscribed: ['doc-published'] });
  await run('update', { id: 1, documentId: 'doc-published', publishedAt: '2026-01-01' });
  await run('update', { id: 3, documentId: 'doc-other', publishedAt: '2026-01-01' });
  await run('delete', { documentId: 'doc-published', entries: [{ documentId: 'doc-published' }] });
  assert.deepEqual(
    calls.map((c) => [c.kind, c.event, c.data.documentId, c.broadcast]),
    [
      ['emit', 'update', 'doc-published', false],
      ['id', 'delete', 'doc-published', false],
    ]
  );
});

test('broadcast types keep broadcasting; actions outside the list go to subscribers only', async () => {
  const { calls, run } = await middlewareSetup({
    subscribed: ['doc-published'],
    config: { contentTypes: [{ uid: ARTICLE.uid, actions: ['create'] }] },
  });
  await run('create', { id: 1, documentId: 'doc-other', publishedAt: '2026-01-01' });
  await run('update', { id: 1, documentId: 'doc-published', publishedAt: '2026-01-01' });
  assert.deepEqual(
    calls.map((c) => [c.event, c.broadcast]),
    [
      ['create', true],
      ['update', false],
    ]
  );
});
