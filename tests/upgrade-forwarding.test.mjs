/**
 * Issue #112: Strapi Data Transfer runs `ws.handleUpgrade` inside a Koa route
 * (`/admin/transfer/runner/*`). Node only hands upgrade requests to Koa when
 * the HTTP server has no `upgrade` listener, and Engine.IO adds one. These
 * tests use a real Koa app with a ws route shaped like
 * @strapi/data-transfer's handleWSUpgrade.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import Koa from 'koa';
import { io as ioClient } from 'socket.io-client';
import WebSocket, { WebSocketServer } from 'ws';
import { SocketIO } from '../server/src/structures/SocketIO.js';
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
  assert.equal(httpServer.listeners('upgrade').filter((l) => l.name === 'listener').length, 0, 'forwarder removed');
  wss.close();
  await httpServer.shutdown();
});
