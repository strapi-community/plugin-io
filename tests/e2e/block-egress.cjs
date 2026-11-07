'use strict';
// Preload for isolated acceptance hosts: only loopback TCP and Unix sockets may connect.
const net = require('node:net');
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const isLocal = (host) => host === undefined || host === '' || LOOPBACK.has(host);
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function connect(...args) {
  const first = args[0];
  const opts = Array.isArray(first) ? first[0] : first;
  const o =
    typeof opts === 'object' && opts !== null
      ? opts
      : { port: opts, host: typeof args[1] === 'string' ? args[1] : undefined };
  if (!o.path && !isLocal(o.host)) {
    const err = new Error(`Egress blocked by acceptance host: ${o.host}`);
    process.nextTick(() => this.destroy(err));
    return this;
  }
  return originalConnect.apply(this, args);
};
const originalFetch = globalThis.fetch;
if (typeof originalFetch === 'function') {
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (!LOOPBACK.has(url.hostname))
      return Promise.reject(new Error(`Egress blocked by acceptance host: ${url.hostname}`));
    return originalFetch(input, init);
  };
}
