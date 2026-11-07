/**
 * Socket and API end-to-end tests against a real Strapi 5 app with the
 * packed plugin installed (scripts/e2e-app.mjs scaffolds one).
 *
 *   IO_E2E_URL=... IO_E2E_EMAIL=... IO_E2E_PASSWORD=... IO_E2E_TOKEN=<full-access token> npm run test:e2e
 *
 * Optional: IO_E2E_VIEWER_EMAIL / IO_E2E_VIEWER_PASSWORD (admin with only
 * the read permissions). Expects the fixture in tests/e2e/app: `article`
 * (broadcast, private `secretNote`, sensitive `internalCode`) and `note`
 * (not broadcast). Settings changed here are restored.
 *
 * @see https://socket.io/docs/v4/client-api/
 */
import assert from 'node:assert/strict';
import { connect as netConnect } from 'node:net';
import { test } from 'node:test';
import { io as ioClient } from 'socket.io-client';

const BASE = process.env.IO_E2E_URL?.replace(/\/$/, '');
const TOKEN = process.env.IO_E2E_TOKEN;
const ADMIN = { email: process.env.IO_E2E_EMAIL, password: process.env.IO_E2E_PASSWORD };
const VIEWER = { email: process.env.IO_E2E_VIEWER_EMAIL, password: process.env.IO_E2E_VIEWER_PASSWORD };
const skip = !BASE || !TOKEN || !ADMIN.email ? 'set IO_E2E_URL, IO_E2E_TOKEN, IO_E2E_EMAIL and IO_E2E_PASSWORD' : false;

/** JSON request helper; returns `{ status, body }`. */
async function request(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

/** Logs an admin in and returns the admin access token. */
async function adminToken(who) {
  const { status, body } = await request('POST', '/admin/login', { body: who });
  assert.equal(status, 200, 'admin login');
  return body.data.token;
}

/** Connects a socket and resolves once connected. */
function connect(auth) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(BASE, { transports: ['websocket'], reconnection: false, auth });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

/** Resolves with the first payload of any listed event that matches, or null after `ms`. */
function waitFor(socket, events, match = () => true, ms = 5000) {
  return new Promise((resolve) => {
    const handlers = [];
    const done = (value) => {
      clearTimeout(timer);
      for (const [event, handler] of handlers) socket.off(event, handler);
      resolve(value);
    };
    const timer = setTimeout(() => done(null), ms);
    for (const event of events) {
      const handler = (payload) => match(payload) && done({ event, payload });
      handlers.push([event, handler]);
      socket.on(event, handler);
    }
  });
}

const ack = (socket, event, data) => new Promise((resolve) => socket.emit(event, data, resolve));

/** Sends a raw HTTP/1.1 request and resolves with status and time, or a timeout. */
function rawRequest({ method, path, headers = {}, body = '' }, ms = 5000) {
  const url = new URL(BASE);
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = netConnect(Number(url.port), url.hostname);
    const lines = [
      `${method} ${path} HTTP/1.1`,
      `Host: ${url.host}`,
      ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
    ];
    if (body) lines.push(`Content-Length: ${Buffer.byteLength(body)}`);
    socket.write(`${lines.join('\r\n')}\r\n\r\n${body}`);
    let data = '';
    const finish = (timedOut) => {
      socket.destroy();
      resolve({ status: Number(data.split(' ')[1]) || null, ms: Date.now() - started, timedOut, raw: data });
    };
    const timer = setTimeout(() => finish(true), ms);
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8');
      if (data.includes('\r\n\r\n')) {
        clearTimeout(timer);
        setTimeout(() => finish(false), 50);
      }
    });
    socket.on('error', () => {
      clearTimeout(timer);
      finish(false);
    });
  });
}

const attributesOf = (payload) => payload?.data?.attributes ?? payload?.data ?? {};

test('published articles reach public and API-token clients, sanitized per audience', { skip }, async () => {
  const anonymous = await connect();
  const token = await connect({ strategy: 'api-token', token: TOKEN });
  try {
    const title = `E2E article ${Date.now()}`;
    const isOurs = (payload) => attributesOf(payload).title === title;
    const events = ['article:create', 'article:publish'];
    const gotPublic = waitFor(anonymous, events, isOurs);
    const gotToken = waitFor(token, events, isOurs);
    const created = await request('POST', '/api/articles?status=published', {
      token: TOKEN,
      body: { data: { title, body: 'Synthetic.', secretNote: 'private value', internalCode: 'sensitive value' } },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    for (const [who, received] of [
      ['public', await gotPublic],
      ['token', await gotToken],
    ]) {
      assert.ok(received, `${who} client received the article`);
      const attributes = attributesOf(received.payload);
      assert.equal(attributes.secretNote, undefined, `${who}: private attribute removed`);
      assert.equal(attributes.internalCode, undefined, `${who}: sensitive field removed`);
    }
  } finally {
    anonymous.close();
    token.close();
  }
});

test(
  'entity subscriptions: only the subscriber receives updates of a type that is not broadcast',
  { skip },
  async (t) => {
    const admin = await adminToken(ADMIN);
    const enable = await request('PUT', '/io/settings', {
      token: admin,
      body: { subscriptions: { enabled: true, maxPerSocket: 5 } },
    });
    assert.equal(enable.status, 200, JSON.stringify(enable.body));
    t.after(() =>
      request('PUT', '/io/settings', { token: admin, body: { subscriptions: { enabled: false, maxPerSocket: 100 } } })
    );

    const notes = await request('GET', '/api/notes');
    const documentId = notes.body.data[0].documentId;
    const follower = await connect();
    const bystander = await connect();
    try {
      assert.deepEqual(
        await ack(follower, 'subscribe-entity', { uid: 'api::note.note', documentId: 'missing0000000' }),
        {
          success: false,
          error: 'Entity not found',
        }
      );
      const reply = await ack(follower, 'subscribe-entity', { uid: 'api::note.note', documentId });
      assert.equal(reply.success, true, JSON.stringify(reply));

      const text = `Updated ${Date.now()}`;
      const isOurs = (payload) => attributesOf(payload).text === text;
      const followed = waitFor(follower, ['note:update'], isOurs);
      const ignored = waitFor(bystander, ['note:update'], isOurs, 1500);
      const updated = await request('PUT', `/api/notes/${documentId}`, { token: TOKEN, body: { data: { text } } });
      assert.equal(updated.status, 200, JSON.stringify(updated.body));
      const received = await followed;
      assert.ok(received, 'subscriber received note:update');
      assert.equal(attributesOf(received.payload).secretNote, undefined, 'private attribute removed');
      assert.equal(await ignored, null, 'a client without subscription receives nothing');
    } finally {
      follower.close();
      bystander.close();
    }
  }
);

test('settings import check: strict validation and settings.update permission', { skip }, async () => {
  const admin = await adminToken(ADMIN);
  const current = await request('GET', '/io/settings', { token: admin });
  const ok = await request('POST', '/io/settings/validate', {
    token: admin,
    body: { ...current.body.data, presence: { enabled: false, showTypingIndicator: true } },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.presence.enabled, false);
  const after = await request('GET', '/io/settings', { token: admin });
  assert.deepEqual(after.body.data, current.body.data, 'validate stores nothing');

  const bad = await request('POST', '/io/settings/validate', {
    token: admin,
    body: { presence: { enabled: 'yes', showTypingIndicator: true }, unknownKey: 1 },
  });
  assert.equal(bad.status, 400);
  const paths = bad.body.error.details.errors.map((e) => e.path.join('.'));
  assert.ok(paths.includes('presence.enabled'), paths.join(','));

  if (VIEWER.email) {
    const viewer = await adminToken(VIEWER);
    const denied = await request('POST', '/io/settings/validate', { token: viewer, body: current.body.data });
    assert.equal(denied.status, 403);
  }
  const anonymous = await request('POST', '/io/settings/validate', { body: {} });
  assert.equal(anonymous.status, 401);
});

test('#112: Data Transfer upgrades reach Strapi and are answered at once', { skip }, async () => {
  const reply = await rawRequest({
    method: 'GET',
    path: '/admin/transfer/runner/push',
    headers: {
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
    },
  });
  assert.equal(reply.timedOut, false, 'answered instead of hanging');
  assert.ok([401, 403].includes(reply.status), `status ${reply.status}`);
});

test('POST with an Upgrade: h2c header keeps its body (IO-RA-02)', { skip }, async () => {
  const body = JSON.stringify({ data: { title: `h2c ${Date.now()}` } });
  const reply = await rawRequest({
    method: 'POST',
    path: '/api/articles',
    headers: {
      Connection: 'Upgrade, HTTP2-Settings, close',
      Upgrade: 'h2c',
      'HTTP2-Settings': 'AAMAAABkAAQAAP__',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body,
  });
  assert.equal(reply.status, 201, reply.raw.split('\r\n')[0]);
});
