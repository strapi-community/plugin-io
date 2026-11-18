/**
 * Fake network for the harness: replaces `fetch`, records every request with its initiator and
 * whether it was aborted, and answers from route handlers. Strapi's `useFetchClient`
 * (`getFetchClient` in @strapi/admin 5.62) and RTK Query both end in `window.fetch`, so this is
 * the only network boundary of the admin.
 */

const BACKEND = 'http://localhost:1337';

/**
 * @typedef {object} RecordedCall
 * @property {string} method - Upper-case HTTP method.
 * @property {string} path - Path and query relative to the backend.
 * @property {string} pathname - Path without query.
 * @property {string | null} body - Request body as text.
 * @property {boolean} aborted - The request's signal was aborted.
 * @property {boolean} fromPlugin - Initiated by code in this repository (stack attribution).
 * @property {boolean} handled - A route handler answered it.
 * @property {boolean} [completed] - A response was delivered (a later abort no longer counts).
 */

/** @type {RecordedCall[]} */
const calls = [];
/** @type {Array<{ method: string, match: string | RegExp | ((path: string) => boolean), reply: Function }>} */
let routes = [];
let repoRoot = '';

/**
 * Whether the current stack contains a frame from the repository (not node_modules, not harness).
 * @returns {boolean} True when plugin code initiated the call.
 */
const initiatedByPlugin = () =>
  (new Error().stack || '')
    .split('\n')
    .map((line) => decodeURIComponent(line))
    .some(
      (line) => repoRoot && line.includes(repoRoot) && !line.includes('node_modules') && !line.includes('/tests/admin/')
    );

/**
 * Matches a route against method and path.
 * @param {{ method: string, match: string | RegExp | Function }} route - Route.
 * @param {string} method - Method.
 * @param {string} path - Path with query.
 * @param {string} pathname - Path without query.
 * @returns {boolean} Match.
 */
const matches = (route, method, path, pathname) => {
  if (route.method !== '*' && route.method !== method) return false;
  if (typeof route.match === 'string') return route.match === pathname || route.match === path;
  if (route.match instanceof RegExp) return route.match.test(path);
  return Boolean(route.match(path, method));
};

/**
 * The fake `fetch`.
 * @param {string | URL | Request} input - URL or request.
 * @param {RequestInit} [init] - Options.
 * @returns {Promise<Response>} Response.
 */
async function fakeFetch(input, init = {}) {
  const url = new URL(typeof input === 'string' ? input : input.url || String(input), BACKEND);
  const method = String(init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
  let body = init.body ?? null;
  if (body && typeof body !== 'string') body = body instanceof FormData ? '[FormData]' : String(body);
  /** @type {RecordedCall} */
  const call = {
    method,
    path: url.pathname + url.search,
    pathname: url.pathname,
    body,
    aborted: false,
    fromPlugin: initiatedByPlugin(),
    handled: false,
  };
  calls.push(call);
  const signal = init.signal || (typeof input === 'object' ? input.signal : undefined);
  const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
  if (signal?.aborted) {
    call.aborted = true;
    throw abortError();
  }
  const route = [...routes].reverse().find((entry) => matches(entry, method, call.path, call.pathname));
  call.handled = Boolean(route);
  const answer = route
    ? Promise.resolve(
        route.reply({
          ...call,
          json: () => (typeof body === 'string' ? JSON.parse(body) : body),
        })
      )
    : Promise.resolve({
        status: 404,
        body: { data: null, error: { status: 404, name: 'NotFoundError', message: 'Not Found' } },
      });
  // Like a browser, an abort rejects at once, even while the server is still answering.
  let onAbort = () => {};
  const aborted = new Promise((_, reject) => {
    onAbort = () => {
      call.aborted = true;
      reject(abortError());
    };
  });
  signal?.addEventListener('abort', onAbort, { once: true });
  let result;
  try {
    result = await Promise.race([answer, aborted]);
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
  const { status = 200, body: payload = null } =
    result && typeof result === 'object' && 'status' in result && 'body' in result ? result : { body: result };
  // Answer on a later task so abort-on-unmount can win the race, as in a browser.
  await new Promise((resolve) => queueMicrotask(resolve));
  if (signal?.aborted) {
    call.aborted = true;
    throw abortError();
  }
  call.completed = true;
  return new Response(payload === null ? null : JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Installs the fake fetch on window and the global object.
 * @param {string} root - Repository root, for initiator attribution.
 */
export const installNetwork = (root) => {
  repoRoot = root;
  globalThis.fetch = fakeFetch;
  globalThis.window.fetch = fakeFetch;
};

export const network = {
  /** @returns {RecordedCall[]} Every request since the last reset. */
  get calls() {
    return calls;
  },
  /**
   * Adds a route; later routes win.
   * @param {string} method - HTTP method or '*'.
   * @param {string | RegExp | Function} match - Path (without or with query), RegExp or predicate.
   * @param {Function | object} reply - Body, `{ status, body }`, or a function returning either.
   */
  on(method, match, reply) {
    routes.push({
      method: method.toUpperCase(),
      match,
      reply: typeof reply === 'function' ? reply : () => reply,
    });
  },
  /** Forgets recorded calls; routes stay. */
  clearCalls() {
    calls.length = 0;
  },
  /** Removes all routes and recorded calls. */
  reset() {
    calls.length = 0;
    routes = [];
  },
  /** @returns {RecordedCall[]} Requests started by plugin code. */
  pluginCalls() {
    return calls.filter((call) => call.fromPlugin);
  },
};
