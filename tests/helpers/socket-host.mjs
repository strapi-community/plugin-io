import { createServer } from 'node:http';
import { io as ioClient } from 'socket.io-client';
import { bootstrapIO } from '../../server/src/bootstrap/io.js';
import { registerClusterSignals, registerInvalidation } from '../../server/src/bootstrap/invalidation.js';
import { createStrapi } from './strapi-stub.mjs';

/**
 * Starts an HTTP server with the plugin's Socket.IO layer and a stub Strapi.
 *
 * @param {object} [options] - Options for createStrapi.
 * @returns {Promise<{ strapi: object, url: string, connect: Function, close: Function }>} Host.
 */
export async function startHost(options = {}) {
  const httpServer = createServer((_req, res) => {
    res.statusCode = 404;
    res.end();
  });
  const sockets = new Set();
  httpServer.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const strapi = createStrapi({ ...options, httpServer });
  await strapi.plugin('io').service('settings').load();
  if (options.settings) await strapi.plugin('io').service('settings').setSettings(options.settings);
  const io = await bootstrapIO({ strapi });
  await strapi.plugin('io').service('cluster').start({ io: io.server, adapterType: io.adapterType });
  registerClusterSignals({ strapi });
  if (options.invalidation) registerInvalidation({ strapi });
  strapi.plugin('io').service('presence').start();
  const url = `http://127.0.0.1:${httpServer.address().port}`;
  const clients = [];

  /**
   * Connects a client and resolves once connected or rejected.
   *
   * @param {object} [auth] - Handshake auth.
   * @param {object} [extra] - Extra client options.
   * @returns {Promise<{ socket: any, error?: Error }>} Result.
   */
  const connect = (auth, extra = {}) =>
    new Promise((resolve) => {
      const socket = ioClient(url, { transports: ['websocket'], reconnection: false, auth, ...extra });
      clients.push(socket);
      socket.on('connect', () => resolve({ socket }));
      socket.on('connect_error', (error) => resolve({ socket, error }));
    });

  const close = async () => {
    for (const client of clients) client.close();
    strapi.plugin('io').service('presence').stop();
    await strapi.plugin('io').service('cluster').stop();
    await strapi.$io.destroy();
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => httpServer.close(() => resolve()));
  };

  return { strapi, url, connect, close };
}

/**
 * Resolves with the next payload of an event, or `null` after `ms`.
 *
 * @param {any} socket - Client socket.
 * @param {string} event - Event name.
 * @param {number} [ms] - Timeout.
 * @returns {Promise<any>} Payload or null.
 */
export const nextEvent = (socket, event, ms = 300) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(null);
    }, ms);
    const handler = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
