/**
 * Issue #112: Strapi Data Transfer runs `ws.handleUpgrade` inside a Koa route
 * (`/admin/transfer/runner/*`). Node only hands upgrade requests to Koa when
 * the HTTP server has no `upgrade` listener, and Engine.IO adds one. These
 * tests use a real Koa app with a ws route shaped like
 * @strapi/data-transfer's handleWSUpgrade.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { connect as netConnect } from 'node:net';
import test from 'node:test';
import Koa from 'koa';
import { io as ioClient } from 'socket.io-client';
import WebSocket, { WebSocketServer } from 'ws';
import { SocketIO } from '../server/src/structures/SocketIO.js';
import { attachUpgradeForwarder } from '../server/src/structures/upgrade-forwarder.js';
import { Server } from 'socket.io';
import { createStrapi } from './helpers/strapi-stub.mjs';

/** Koa app with a transfer-like WebSocket route and a 401 route. */
function createKoaApp() {
  const app = new Koa();
  const wss = new WebSocketServer({ noServer: true });
  app.use(async (ctx, next) => {
    if (ctx.path === '/admin/transfer/runner/push') {
      if (ctx.get('authorization') !== 'Bearer transfer-token') {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
      }
      wss.handleUpgrade(ctx.req, ctx.request.socket, Buffer.alloc(0), (client) => {
        client.send('ready');
      });
      ctx.respond = false;
      return;
    }
    if (ctx.path === '/api/echo') {
      const chunks = [];
      for await (const chunk of ctx.req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString('utf8');
      const expected = Number(ctx.get('content-length') || 0);
      if (Buffer.byteLength(body) !== expected) {
        ctx.status = 400;
        ctx.body = 'request size did not match content length';
        return;
      }
      ctx.body = { method: ctx.method, body };
      return;
    }
    await next();
  });
  return { app, wss };
}

/** Starts an HTTP server with Koa as request handler, tracking raw sockets. */
async function listen(app) {
  const httpServer = createServer(app.callback());
  const sockets = new Set();
  httpServer.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  httpServer.shutdown = async () => {
    for (const socket of sockets) socket.destroy();
    if (httpServer.listening) await new Promise((resolve) => httpServer.close(() => resolve()));
  };
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  return { httpServer, port: httpServer.address().port };
}

/**
 * Opens a WebSocket and resolves with the first message, the HTTP status of
 * a rejected upgrade, or 'timeout'.
 */
function openWs(url, headers, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    const timer = setTimeout(() => {
      ws.terminate();
      resolve({ result: 'timeout' });
    }, timeoutMs);
    ws.on('message', (data) => {
      clearTimeout(timer);
      ws.close();
      resolve({ result: 'open', message: data.toString() });
    });
    ws.on('unexpected-response', (_req, res) => {
      clearTimeout(timer);
      resolve({ result: 'rejected', status: res.statusCode });
      ws.terminate();
    });
    ws.on('error', () => {
      clearTimeout(timer);
      resolve({ result: 'error' });
    });
  });
}

test('without the forwarder a plain Socket.IO server makes the transfer upgrade hang (reproduces #112)', async () => {
  const { app, wss } = createKoaApp();
  const { httpServer, port } = await listen(app);
  const io = new Server(httpServer, { destroyUpgrade: false });
  const outcome = await openWs(`ws://127.0.0.1:${port}/admin/transfer/runner/push`, {
    authorization: 'Bearer transfer-token',
  });
  assert.equal(outcome.result, 'timeout');
  wss.close();
  io.engine.close();
  await httpServer.shutdown();
});

test('SocketIO forwards foreign upgrades to Strapi: transfer gets 101, bad token gets 401, /socket.io still works', async () => {
  const { app, wss } = createKoaApp();
  const { httpServer, port } = await listen(app);
  const strapi = createStrapi({ httpServer });
  await strapi.plugin('io').service('settings').load();
  const io = new SocketIO({}, { strapi });
  strapi.$io = io;

  const ok = await openWs(`ws://127.0.0.1:${port}/admin/transfer/runner/push`, {
    authorization: 'Bearer transfer-token',
  });
  assert.deepEqual(ok, { result: 'open', message: 'ready' });

  const denied = await openWs(`ws://127.0.0.1:${port}/admin/transfer/runner/push`, {});
  assert.deepEqual(denied, { result: 'rejected', status: 401 });

  const client = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('connect_error', reject);
  });
  assert.equal(client.connected, true);
  client.close();

  await io.destroy();
  wss.close();
  await httpServer.shutdown();
});

test('the forwarder stays out of the way when the app attached its own upgrade listener', async () => {
  const { app, wss } = createKoaApp();
  const { httpServer, port } = await listen(app);
  const strapi = createStrapi({ httpServer });
  await strapi.plugin('io').service('settings').load();
  const io = new SocketIO({}, { strapi });
  strapi.$io = io;
  const custom = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (req, socket, head) => {
    if (req.url === '/custom') custom.handleUpgrade(req, socket, head, (ws) => ws.send('custom'));
  });
  const outcome = await openWs(`ws://127.0.0.1:${port}/custom`, {});
  assert.deepEqual(outcome, { result: 'open', message: 'custom' });
  await io.destroy();
  custom.close();
  wss.close();
  await httpServer.shutdown();
});

test("destroy() removes the forwarder and does not close Strapi's HTTP server (#109)", async () => {
  const { app, wss } = createKoaApp();
  const { httpServer } = await listen(app);
  const strapi = createStrapi({ httpServer });
  await strapi.plugin('io').service('settings').load();
  const before = httpServer.listenerCount('upgrade');
  const io = new SocketIO({}, { strapi });
  assert.ok(httpServer.listenerCount('upgrade') > before);
  await io.destroy();
  assert.equal(httpServer.listening, true, 'HTTP server must stay open for Strapi to close');
  assert.notEqual(httpServer.shouldUpgradeCallback.name, 'shouldUpgradeCallback', 'original callback restored');
  wss.close();
  await httpServer.shutdown();
});

/**
 * Sends a raw HTTP/1.1 request and resolves with the status code and body.
 */
function rawRequest(port, { method = 'POST', path = '/api/echo', headers = {}, body = '' }) {
  return new Promise((resolve) => {
    const socket = netConnect(port, '127.0.0.1');
    const lines = [`${method} ${path} HTTP/1.1`, 'Host: 127.0.0.1', 'Connection: Upgrade, close'];
    for (const [key, value] of Object.entries(headers)) lines.push(`${key}: ${value}`);
    if (body) lines.push(`Content-Length: ${Buffer.byteLength(body)}`);
    socket.write(`${lines.join('\r\n')}\r\n\r\n${body}`);
    let data = '';
    socket.on('data', (chunk) => (data += chunk.toString('utf8')));
    const done = () => {
      const status = Number(data.split(' ')[1]) || null;
      resolve({ status, body: data.split('\r\n\r\n').slice(1).join('\r\n\r\n') });
    };
    socket.on('end', done);
    socket.on('error', done);
    setTimeout(() => {
      socket.destroy();
      done();
    }, 1500).unref();
  });
}

test('POST with a body and an Upgrade header still reaches Koa with its body (IO-RA-02)', async (t) => {
  const { app, wss } = createKoaApp();
  const { httpServer, port } = await listen(app);
  const strapi = createStrapi({ httpServer });
  await strapi.plugin('io').service('settings').load();
  const io = new SocketIO({}, { strapi });
  strapi.$io = io;
  t.after(async () => {
    await io.destroy();
    wss.close();
    await httpServer.shutdown();
  });
  const body = JSON.stringify({ identifier: 'reader@example.test', password: 'x' });
  for (const upgrade of ['h2c', 'websocket']) {
    const reply = await rawRequest(port, {
      headers: { Upgrade: upgrade, 'Content-Type': 'application/json', 'HTTP2-Settings': 'AAMAAABkAAQAAP__' },
      body,
    });
    assert.equal(reply.status, 200, `${upgrade}: ${reply.body}`);
    assert.deepEqual(JSON.parse(reply.body), { method: 'POST', body });
  }
  const get = await rawRequest(port, { method: 'GET', headers: { Upgrade: 'h2c' } });
  assert.equal(get.status, 200, 'bodyless h2c GET');
});

test('without shouldUpgradeCallback (Node outside the engines) the forwarder stays out of the way', () => {
  const fake = { listeners: () => [], on() {}, off() {} };
  assert.equal(attachUpgradeForwarder({ httpServer: fake, enginePath: '/socket.io/', ownListeners: [] }), null);
});

test('the supported Node.js engines have shouldUpgradeCallback (no legacy upgrade path)', () => {
  const server = createServer();
  assert.equal(typeof server.shouldUpgradeCallback, 'function', `Node ${process.version}`);
});
