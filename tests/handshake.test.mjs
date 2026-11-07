import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS } from '../server/src/utils/settings-schema.js';
import { startHost } from './helpers/socket-host.mjs';

const usersPermissions = { service: () => undefined };
const security = (patch) => ({ security: { ...DEFAULT_SETTINGS.security, ...patch } });

test('anonymous clients join the public role room by type', async () => {
  const host = await startHost({ usersPermissions });
  const { socket, error } = await host.connect();
  assert.equal(error, undefined);
  const [serverSocket] = await host.strapi.$io.server.fetchSockets();
  assert.ok(serverSocket.rooms.has('io-role-public'));
  assert.equal(serverSocket.data.kind, 'public');
  socket.close();
  await host.close();
});

test('"Require authentication" rejects anonymous clients without counting a failure', async () => {
  const host = await startHost({ usersPermissions, settings: security({ requireAuthentication: true }) });
  const { error } = await host.connect();
  assert.equal(error.message, 'Authentication required');
  assert.equal(host.strapi.$io._handshake.failures.size(), 0);
  await host.close();
});

test('blocked IPs and roles that may not connect are rejected', async () => {
  const host = await startHost({ usersPermissions, settings: security({ ipBlacklist: ['127.0.0.0/8'] }) });
  assert.equal((await host.connect()).error.message, 'Connection not allowed');
  await host.close();

  const host2 = await startHost({
    usersPermissions,
    settings: { rolePermissions: { public: { canConnect: false } } },
  });
  assert.equal((await host2.connect()).error.message, 'Connection not allowed');
  await host2.close();
});

test('an allow list that does not contain the client rejects it', async () => {
  const host = await startHost({ usersPermissions, settings: security({ ipWhitelist: ['203.0.113.0/24'] }) });
  assert.equal((await host.connect()).error.message, 'Connection not allowed');
  await host.close();
});

test('the connection cap is enforced', async () => {
  const host = await startHost({
    usersPermissions,
    settings: { connection: { ...DEFAULT_SETTINGS.connection, maxConnections: 1 } },
  });
  assert.equal((await host.connect()).error, undefined);
  assert.equal((await host.connect()).error.message, 'Server is at capacity. Try again later.');
  await host.close();
});

test('bad tokens get one generic message and lock the IP out after 20 failures', async () => {
  const host = await startHost({
    usersPermissions,
    coreServices: {
      'admin::api-token-content-api': { hash: (t) => `h:${t}`, getByAccessKey: async () => null },
    },
  });
  const first = await host.connect({ strategy: 'api-token', token: 'nope' });
  assert.equal(first.error.message, 'Authentication failed');
  const unknown = await host.connect({ strategy: 'magic', token: 'x' });
  assert.equal(unknown.error.message, 'Authentication failed', 'unknown strategies are rejected');
  for (let i = 0; i < 18; i += 1) await host.connect({ strategy: 'api-token', token: 'nope' });
  const locked = await host.connect();
  assert.equal(locked.error.message, 'Too many authentication attempts. Try again later.');
  await host.close();
});

test('admin-kind API tokens are rejected for socket handshakes', async () => {
  const host = await startHost({
    usersPermissions,
    coreServices: {
      'admin::api-token-content-api': {
        hash: (t) => `h:${t}`,
        getByAccessKey: async () => ({
          id: 9,
          kind: 'admin',
          type: 'full-access',
          expiresAt: null,
          lastUsedAt: new Date().toISOString(),
        }),
      },
    },
  });
  assert.equal((await host.connect({ strategy: 'api-token', token: 'admin' })).error.message, 'Authentication failed');
  await host.close();
});

test('content API tokens join io-token-<id> (stable across renames)', async () => {
  const host = await startHost({
    usersPermissions,
    coreServices: {
      'admin::api-token-content-api': {
        hash: (t) => `h:${t}`,
        getByAccessKey: async () => ({
          id: 5,
          name: 'My Token',
          kind: 'content-api',
          type: 'read-only',
          expiresAt: null,
          lastUsedAt: new Date().toISOString(),
        }),
      },
    },
  });
  assert.equal((await host.connect({ strategy: 'api-token', token: 'ok' })).error, undefined);
  const [serverSocket] = await host.strapi.$io.server.fetchSockets();
  assert.ok(serverSocket.rooms.has('io-token-5'));
  assert.equal(serverSocket.data.kind, 'token');
  await host.close();
});

test('custom namespaces created at runtime use the same handshake', async () => {
  const host = await startHost({ usersPermissions, settings: security({ requireAuthentication: true }) });
  host.strapi.$io.server.of('/chat');
  const result = await new Promise((resolve) => {
    import('socket.io-client').then(({ io }) => {
      const socket = io(`${host.url}/chat`, { transports: ['websocket'], reconnection: false });
      socket.on('connect', () => resolve({ ok: true, socket }));
      socket.on('connect_error', (error) => resolve({ error, socket }));
    });
  });
  assert.equal(result.error?.message, 'Authentication required');
  result.socket.close();
  await host.close();
});
