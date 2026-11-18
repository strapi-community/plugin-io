/**
 * Preloaded with `node --import ./tests/admin/harness/setup.mjs --test ...`.
 *
 * 1. Creates a jsdom browser environment on the globals (window, document, navigator, DOM classes)
 *    before React, styled-components or the Design System are imported.
 * 2. Instruments every resource a plugin component can leak and counts it: intervals, pending
 *    timeouts, animation frames, window/document listeners, WebSocket, EventSource,
 *    BroadcastChannel, ResizeObserver, IntersectionObserver, MutationObserver and fetch.
 * 3. Registers the module hooks in loader.mjs (JSX/TS transpile, bundler-style resolution) with
 *    the module aliases below.
 *
 * Docs: jsdom 31 README (https://github.com/jsdom/jsdom#readme), React "act" testing
 * (https://react.dev/reference/react/act: `IS_REACT_ACT_ENVIRONMENT`), Node customization hooks.
 */
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const harnessDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(harnessDir, '../../..');

/** Modules the plugin imports that the harness replaces with counting fakes. */
const ALIASES = {
  'socket.io-client': path.join(harnessDir, 'fake-socket.mjs'),
};

register(pathToFileURL(path.join(harnessDir, 'loader.mjs')), import.meta.url, {
  data: { root, aliases: ALIASES },
});

const dom = new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>', {
  url: 'http://localhost:1337/admin/',
  pretendToBeVisual: true,
});
const { window } = dom;

// Node's own globals (timers, fetch, AbortController, Event, URL, ...) stay; DOM classes come
// from jsdom. Timers are unified so `window.setTimeout` and `setTimeout` are the same instrumented
// functions.
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis || key.startsWith('_')) continue;
  try {
    globalThis[key] = window[key];
  } catch {
    // read-only jsdom internals
  }
}
// Node 25+ has its own Web Storage globals (`localStorage` is undefined without
// --localstorage-file), so the loop above skips them: use jsdom's storage.
for (const key of ['localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
}
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
// React DOM expects the jsdom event classes on `window` and on the global object to match.
// Abort signals must be jsdom's: components pass them to DOM `addEventListener({ signal })`.
for (const key of [
  'Event',
  'CustomEvent',
  'EventTarget',
  'KeyboardEvent',
  'MouseEvent',
  'FocusEvent',
  'AbortController',
  'AbortSignal',
]) {
  globalThis[key] = window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Live resource counters, read by index.jsx (`snapshotResources`). */
const resources = {
  intervals: new Map(),
  timeouts: new Map(),
  frames: new Map(),
  listeners: new Map(),
  sockets: new Set(),
  observers: new Set(),
};
globalThis.__strictHarness = { resources, window };

/**
 * Records where a resource was created, to name the owner in a failure message.
 * @returns {string} Stack lines of the caller in the repository (no node_modules).
 */
const origin = () => {
  const frames = (new Error().stack || '')
    .split('\n')
    .slice(3)
    .map((line) => decodeURIComponent(line).replace('file://', ''));
  const own = frames
    .filter((line) => line.includes(root) && !line.includes('node_modules') && !line.includes(harnessDir))
    .slice(0, 3)
    .map((line) =>
      line
        .trim()
        .replace(/\?.*?(?=:\d+:\d+)/, '')
        .replace(root, '.')
        .replace(/^at /, '')
    );
  if (own.length) return own.join(' <- ');
  const library = frames.find((line) => line.includes('node_modules'));
  if (!library) return 'lib:runtime';
  // Package path without line numbers, so the same call site matches across runs.
  return `lib:${library.slice(library.lastIndexOf('node_modules/') + 13).replace(/:\d+:\d+\)?$/, '')}`;
};

const nodeSetTimeout = globalThis.setTimeout;
const nodeClearTimeout = globalThis.clearTimeout;
const nodeSetInterval = globalThis.setInterval;
const nodeClearInterval = globalThis.clearInterval;

/**
 * setTimeout that tracks pending timeouts until they run or are cleared.
 * @param {Function} callback - Callback.
 * @param {number} [delay] - Delay in ms.
 * @param {...unknown} args - Arguments.
 * @returns {ReturnType<typeof setTimeout>} Handle.
 */
function trackedSetTimeout(callback, delay, ...args) {
  const handle = nodeSetTimeout(
    (...callArgs) => {
      resources.timeouts.delete(handle);
      if (typeof callback === 'function') callback(...callArgs);
    },
    delay,
    ...args
  );
  resources.timeouts.set(handle, { delay: Number(delay) || 0, origin: origin() });
  return handle;
}
function trackedClearTimeout(handle) {
  resources.timeouts.delete(handle);
  nodeClearTimeout(handle);
}
function trackedSetInterval(callback, delay, ...args) {
  const handle = nodeSetInterval(callback, delay, ...args);
  resources.intervals.set(handle, { delay: Number(delay) || 0, origin: origin() });
  return handle;
}
function trackedClearInterval(handle) {
  resources.intervals.delete(handle);
  nodeClearInterval(handle);
}
for (const target of [globalThis, window]) {
  target.setTimeout = trackedSetTimeout;
  target.clearTimeout = trackedClearTimeout;
  target.setInterval = trackedSetInterval;
  target.clearInterval = trackedClearInterval;
}

let frameId = 0;
window.requestAnimationFrame = globalThis.requestAnimationFrame = (callback) => {
  frameId += 1;
  const id = frameId;
  const handle = nodeSetTimeout(() => {
    resources.frames.delete(id);
    callback(performance.now());
  }, 16);
  resources.frames.set(id, { handle, origin: origin() });
  return id;
};
window.cancelAnimationFrame = globalThis.cancelAnimationFrame = (id) => {
  const frame = resources.frames.get(id);
  if (frame) nodeClearTimeout(frame.handle);
  resources.frames.delete(id);
};

/**
 * Counts listeners on long-lived targets (window, document, document.body). Listeners on
 * elements inside the rendered tree go away with the tree and are not counted.
 * @param {EventTarget} target - Target to instrument.
 * @param {string} name - Name used in reports.
 */
const trackListeners = (target, name) => {
  const add = target.addEventListener.bind(target);
  const remove = target.removeEventListener.bind(target);
  const keyOf = (type, listener, options) => {
    const capture = typeof options === 'boolean' ? options : Boolean(options && options.capture);
    return { type, listener, capture };
  };
  target.addEventListener = (type, listener, options) => {
    if (listener) {
      const key = keyOf(type, listener, options);
      const exists = [...resources.listeners.values()].some(
        (entry) =>
          entry.target === name &&
          entry.type === key.type &&
          entry.listener === listener &&
          entry.capture === key.capture
      );
      if (!exists) {
        const id = Symbol(type);
        resources.listeners.set(id, { target: name, ...key, origin: origin() });
        const signal = options && typeof options === 'object' ? options.signal : undefined;
        if (signal) signal.addEventListener('abort', () => resources.listeners.delete(id), { once: true });
        // A `once` listener is gone after its first event.
        if (options && typeof options === 'object' && options.once) {
          add(type, () => resources.listeners.delete(id), { once: true, capture: key.capture });
        }
      }
    }
    add(type, listener, options);
  };
  target.removeEventListener = (type, listener, options) => {
    const key = keyOf(type, listener, options);
    for (const [id, entry] of resources.listeners) {
      if (
        entry.target === name &&
        entry.type === key.type &&
        entry.listener === listener &&
        entry.capture === key.capture
      ) {
        resources.listeners.delete(id);
        break;
      }
    }
    remove(type, listener, options);
  };
};
trackListeners(window, 'window');
trackListeners(window.document, 'document');
trackListeners(window.document.body, 'body');

/**
 * Base class for counted connection-like fakes (WebSocket, EventSource, BroadcastChannel).
 */
class CountedConnection extends window.EventTarget {
  /**
   * @param {string} kind - Constructor name.
   * @param {string} [url] - URL or channel name.
   */
  constructor(kind, url) {
    super();
    this.kind = kind;
    this.url = String(url ?? '');
    this.readyState = 0;
    this.origin = origin();
    resources.sockets.add(this);
  }
  close() {
    this.readyState = 3;
    resources.sockets.delete(this);
  }
  send() {}
  postMessage() {}
}
globalThis.WebSocket = window.WebSocket = class WebSocket extends CountedConnection {
  constructor(url) {
    super('WebSocket', url);
  }
};
globalThis.EventSource = window.EventSource = class EventSource extends CountedConnection {
  constructor(url) {
    super('EventSource', url);
  }
};
globalThis.BroadcastChannel = window.BroadcastChannel = class BroadcastChannel extends CountedConnection {
  constructor(name) {
    super('BroadcastChannel', name);
  }
};

/**
 * Counted observer fake for ResizeObserver and IntersectionObserver (jsdom has neither).
 * @param {string} kind - Constructor name.
 * @returns {Function} Observer class.
 */
const countedObserver = (kind) =>
  class {
    constructor(callback) {
      this.kind = kind;
      this.callback = callback;
      this.targets = new Set();
      this.origin = origin();
    }
    observe(target) {
      this.targets.add(target);
      resources.observers.add(this);
    }
    unobserve(target) {
      this.targets.delete(target);
      if (this.targets.size === 0) resources.observers.delete(this);
    }
    disconnect() {
      this.targets.clear();
      resources.observers.delete(this);
    }
    takeRecords() {
      return [];
    }
  };
globalThis.ResizeObserver = window.ResizeObserver = countedObserver('ResizeObserver');
globalThis.IntersectionObserver = window.IntersectionObserver = countedObserver('IntersectionObserver');

window.matchMedia = globalThis.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});
window.scrollTo = () => {};
// jsdom has no layout: Range geometry (CodeMirror in the Design System's JSONInput measures text).
for (const name of ['getClientRects', 'getBoundingClientRect']) {
  if (!window.Range.prototype[name]) {
    window.Range.prototype[name] =
      name === 'getClientRects' ? () => [] : () => window.DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
  }
}
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => {};
  window.HTMLElement.prototype.setPointerCapture = () => {};
}
