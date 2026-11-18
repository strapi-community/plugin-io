/**
 * Counting fake of `socket.io-client` 4.8 (`io(url, options)` returns a Socket with on/off/emit,
 * connect/disconnect/close and `io` the Manager). Every socket that is created and not
 * disconnected stays in `__strictHarness.resources.sockets`, so a test sees a leaked connection.
 * Docs: https://socket.io/docs/v4/client-api/
 */
const resources = () => globalThis.__strictHarness.resources;

class FakeSocket {
  /**
   * @param {string} url - Server URL.
   * @param {object} [options] - Client options.
   */
  constructor(url, options = {}) {
    this.kind = 'socket.io';
    this.url = String(url ?? '');
    this.options = options;
    this.connected = false;
    this.disconnected = true;
    this.id = undefined;
    this.handlers = new Map();
    this.emitted = [];
    this.io = {
      on: () => this.io,
      off: () => this.io,
      opts: options,
      engine: { on() {}, off() {} },
    };
    this.origin = (new Error().stack || '').split('\n').slice(2, 6).join(' <- ');
    if (options.autoConnect !== false) this.connect();
  }
  connect() {
    if (this.connected) return this;
    this.connected = true;
    this.disconnected = false;
    resources().sockets.add(this);
    return this;
  }
  open() {
    return this.connect();
  }
  disconnect() {
    this.connected = false;
    this.disconnected = true;
    resources().sockets.delete(this);
    return this;
  }
  close() {
    return this.disconnect();
  }
  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(handler);
    return this;
  }
  once(event, handler) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      handler(...args);
    };
    return this.on(event, wrapped);
  }
  off(event, handler) {
    if (!event) this.handlers.clear();
    else if (!handler) this.handlers.delete(event);
    else this.handlers.get(event)?.delete(handler);
    return this;
  }
  removeAllListeners(event) {
    return this.off(event);
  }
  onAny() {
    return this;
  }
  offAny() {
    return this;
  }
  emit(event, ...args) {
    this.emitted.push({ event, args });
    return this;
  }
  timeout() {
    return this;
  }
  emitWithAck(event, ...args) {
    this.emitted.push({ event, args });
    return Promise.resolve(undefined);
  }
  /**
   * Test helper: delivers a server event to the registered handlers.
   * @param {string} event - Event name.
   * @param {...unknown} args - Payload.
   */
  receive(event, ...args) {
    for (const handler of [...(this.handlers.get(event) || [])]) handler(...args);
  }
}

/** Every socket created in this test file, open or closed. */
export const createdSockets = [];

/**
 * `io()` of socket.io-client.
 * @param {string | object} [url] - Server URL or options.
 * @param {object} [options] - Options.
 * @returns {FakeSocket} Socket.
 */
export function io(url, options) {
  const socket = typeof url === 'object' ? new FakeSocket('', url) : new FakeSocket(url, options);
  createdSockets.push(socket);
  return socket;
}
export const connect = io;
export const Socket = FakeSocket;
export class Manager {
  socket(namespace, options) {
    return io(namespace, options);
  }
}
export default io;
