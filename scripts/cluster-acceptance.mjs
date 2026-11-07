#!/usr/bin/env node
/**
 * Multi-process acceptance run: the packed plugin in a Strapi 5.61 app on
 * PostgreSQL, started as 2 "replicas" (two separate pm2 daemons in cluster
 * mode with 4 workers each, 8 processes) behind a non-sticky round-robin
 * balancer with WebSocket upgrade passthrough, like two Railway replicas
 * running `pm2 -i 4`. It checks presence tokens, content events, monitoring
 * totals, reconnects after an edge drop and a pm2 reload, settings
 * propagation and conflicts, revocation, the connection cap, the lockout,
 * exact socket ids and recovery after the database drops the adapter
 * connections. See CONTRIBUTING.md "Cluster acceptance run".
 *
 *   npm run build
 *   node scripts/cluster-acceptance.mjs --pg postgres://user@127.0.0.1:5432/postgres
 *
 * Options:
 *   --pg <url>      PostgreSQL server URL with a role that may create
 *                   databases (or IO_CLUSTER_PG_URL). The run drops and
 *                   recreates the database named by --db on that server.
 *   --db <name>     Database name (default io_cluster_acceptance).
 *   --dir <path>    App directory outside this repository (default: a folder
 *                   in the OS temp directory), recreated unless --reuse.
 *   --reuse         Keep an app installed by an earlier run (only the
 *                   database is recreated). Use it for repeated runs.
 *   --ports <a,b>   Replica ports (default 1391,1392).
 *   --lb <port>     Balancer port (default 1393).
 *   --runs <n>      Repeat the checks n times on fresh databases (default 1).
 *
 * Synthetic data only. Secrets, admin passwords and tokens are generated per
 * run, passed through the environment and never printed. Outgoing
 * connections from the app are limited to loopback.
 */
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import {
  cpSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createBalancer } from './cluster/balancer.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESERVED_PORTS = new Set([1337, 1338, 1340, 1345, 1351, 1352, 1353, 1354]);
const STRAPI_VERSION = '5.61.0';
const EXTRA_PACKAGES = ['pg@8.23.1', '@socket.io/postgres-adapter@0.5.0', 'pm2@7.1.1'];
// Plugin defaults (config.cluster): the cap and the monitoring totals read
// the other processes' heartbeats.
const POLL_INTERVAL = 3000;
const HEARTBEAT_INTERVAL = 10_000;
const PROCESSES = 8;

const { values: args } = parseArgs({
  options: {
    pg: { type: 'string', default: process.env.IO_CLUSTER_PG_URL ?? '' },
    db: { type: 'string', default: 'io_cluster_acceptance' },
    dir: { type: 'string', default: join(tmpdir(), 'plugin-io-cluster-app') },
    reuse: { type: 'boolean', default: false },
    ports: { type: 'string', default: '1391,1392' },
    lb: { type: 'string', default: '1393' },
    runs: { type: 'string', default: '1' },
  },
});

const usage = (message) => {
  console.error(message);
  process.exit(2);
};
if (!args.pg) usage('Pass --pg <postgres server url> or set IO_CLUSTER_PG_URL.');
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(args.db)) usage('--db must be a plain lower-case identifier.');
const PORTS = args.ports.split(',').map(Number);
const LB = Number(args.lb);
for (const port of [...PORTS, LB]) {
  if (!Number.isInteger(port) || port < 1024 || RESERVED_PORTS.has(port)) usage(`Refusing port ${port}.`);
}
if (PORTS.length !== 2) usage('--ports takes two ports.');
// Every port must be free before anything starts: a busy replica port would
// make the health waits run into their 3-minute timeouts.
const portFree = (port) =>
  new Promise((done) => {
    const probe = createServer();
    probe.once('error', () => done(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => done(true)));
  });
for (const port of [...PORTS, LB]) {
  if (!(await portFree(port))) usage(`Port ${port} is in use on 127.0.0.1. Pass free ports with --ports and --lb.`);
}
const RUNS = Number(args.runs);
if (!Number.isInteger(RUNS) || RUNS < 1 || RUNS > 20) usage('--runs takes 1 to 20.');
const APP = resolve(ROOT, args.dir);
if (APP === ROOT || APP.startsWith(`${ROOT}/`) || ROOT.startsWith(`${APP}/`)) {
  usage('Use an app directory outside this repository.');
}
const serverUrl = new URL(args.pg);
const dbUrl = (name) => {
  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  return url.toString();
};

const T0 = Date.now();
const ts = () => `+${((Date.now() - T0) / 1000).toFixed(1)}s`;
const log = (...a) => console.log(ts(), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const secret = () => randomBytes(24).toString('base64url');

/** Runs a command, writes its output to `logFile` and fails the run on a non-zero exit. */
function run(command, commandArgs, { cwd = ROOT, logFile } = {}) {
  try {
    const out = execFileSync(command, commandArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (logFile) writeFileSync(logFile, out);
  } catch (error) {
    if (logFile) writeFileSync(logFile, `${error.stdout ?? ''}${error.stderr ?? ''}`);
    console.error(`${command} ${commandArgs[0]} failed${logFile ? `; see ${logFile}` : ''}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------- app setup
const MARKER = '.io-cluster-app';
const installed = existsSync(join(APP, MARKER)) && existsSync(join(APP, 'node_modules', 'pm2'));
if (!(args.reuse && installed)) {
  if (existsSync(APP)) {
    if (!existsSync(join(APP, MARKER)) && readdirSync(APP).length > 0) {
      usage(`${APP} exists and was not created by this script; choose another --dir.`);
    }
    rmSync(APP, { recursive: true, force: true });
  }
  if (!existsSync(join(ROOT, 'dist/server/index.js'))) usage('Run "npm run build" first.');
  mkdirSync(join(APP, 'pkg'), { recursive: true });
  mkdirSync(join(APP, 'logs'), { recursive: true });
  writeFileSync(join(APP, MARKER), 'Created by scripts/cluster-acceptance.mjs; removed on the next run.\n');
  cpSync(join(ROOT, 'tests/e2e/app'), APP, { recursive: true });
  cpSync(join(ROOT, 'tests/cluster/app'), APP, { recursive: true });
  cpSync(join(ROOT, 'tests/e2e/block-egress.cjs'), join(APP, 'block-egress.cjs'));

  log('[setup] packing the plugin');
  run('npm', ['pack', '--ignore-scripts', '--pack-destination', join(APP, 'pkg')], {
    logFile: join(APP, 'logs', 'pack.log'),
  });
  const tarball = readdirSync(join(APP, 'pkg')).find((f) => f.endsWith('.tgz'));
  const plugin = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const appPackage = {
    name: 'io-cluster-app',
    private: true,
    version: '0.0.0',
    dependencies: {
      '@strapi/strapi': STRAPI_VERSION,
      '@strapi/plugin-users-permissions': STRAPI_VERSION,
      '@strapi-community/plugin-io': `file:./pkg/${tarball}`,
      'better-sqlite3': '12.11.1',
      react: '18.3.1',
      'react-dom': '18.3.1',
      'react-router-dom': '6.30.6',
      'styled-components': '6.6.0',
    },
    engines: plugin.engines,
  };
  writeFileSync(join(APP, 'package.json'), `${JSON.stringify(appPackage, null, 2)}\n`);
  // Same lockfile as scripts/e2e-app.mjs, pointed at this run's tarball.
  const lockPath = join(APP, 'package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const entry = lock.packages['node_modules/@strapi-community/plugin-io'];
  lock.packages[''].name = 'io-cluster-app';
  lock.packages[''].dependencies['@strapi-community/plugin-io'] = `file:./pkg/${tarball}`;
  lock.packages[''].engines = plugin.engines;
  entry.version = plugin.version;
  entry.resolved = `file:pkg/${tarball}`;
  entry.integrity = `sha512-${createHash('sha512')
    .update(readFileSync(join(APP, 'pkg', tarball)))
    .digest('base64')}`;
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

  log(`[setup] installing Strapi ${STRAPI_VERSION}, the plugin and ${EXTRA_PACKAGES.join(', ')}`);
  run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: APP,
    logFile: join(APP, 'logs', 'install.log'),
  });
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...EXTRA_PACKAGES], {
    cwd: APP,
    logFile: join(APP, 'logs', 'install-extra.log'),
  });
}

const appRequire = createRequire(join(APP, 'package.json'));
const { io } = appRequire('socket.io-client');
const { Client } = appRequire('pg');

/** Runs one SQL statement on `database` and returns the rows. */
async function sql(text, database = args.db) {
  const client = new Client({ connectionString: dbUrl(database) });
  await client.connect();
  try {
    return (await client.query(text)).rows;
  } finally {
    await client.end();
  }
}

const strapiBin = join(APP, 'node_modules', '.bin', 'strapi');
const PM2 = join(APP, 'node_modules', '.bin', 'pm2');
// pm2 talks to its daemon over Unix sockets in PM2_HOME; macOS limits socket
// paths to 104 bytes, so PM2_HOME is a short symlink to a folder in the app.
const pm2Home = (i) => `/tmp/io-cluster-pm2-r${i}`;
const pm2Dir = (i) => join(APP, `pm2-r${i}`);

/**
 * One acceptance pass on a fresh database. Returns the number of failed checks.
 *
 * @param {number} pass - Pass number (1-based).
 * @returns {Promise<number>} Failed checks.
 */
async function acceptance(pass) {
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok });
    console.log(`${ts()} ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  };

  await sql(`DROP DATABASE IF EXISTS ${args.db} WITH (FORCE)`, 'postgres');
  await sql(`CREATE DATABASE ${args.db}`, 'postgres');
  log(`[run ${pass}/${RUNS}] fresh database ${args.db} on ${serverUrl.host}`);

  const credentials = {
    IO_E2E_EMAIL: 'ada.admin@example.test',
    IO_E2E_PASSWORD: `Aa1-${secret()}`,
    IO_E2E_VIEWER_EMAIL: 'vic.viewer@example.test',
    IO_E2E_VIEWER_PASSWORD: `Vv1-${secret()}`,
  };
  const seedOut = join(APP, '.tmp', 'seed.json');
  mkdirSync(dirname(seedOut), { recursive: true });
  mkdirSync(join(APP, 'logs'), { recursive: true });
  rmSync(seedOut, { force: true });
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    STRAPI_TELEMETRY_DISABLED: 'true',
    STRAPI_DISABLE_UPDATE_NOTIFICATION: 'true',
    DATABASE_URL: dbUrl(args.db),
    APP_KEYS: [secret(), secret()].join(','),
    ADMIN_JWT_SECRET: secret(),
    API_TOKEN_SALT: secret(),
    TRANSFER_TOKEN_SALT: secret(),
    ENCRYPTION_KEY: secret(),
    JWT_SECRET: secret(),
    IO_E2E_SEED_OUT: seedOut,
    ...credentials,
  };
  const pm2 = (i, pm2Args, extra = {}) =>
    execFileSync(PM2, pm2Args, {
      cwd: APP,
      env: { ...env, PM2_HOME: pm2Home(i), ...extra },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 120_000,
    });
  const children = [];
  const stopAll = () => {
    children.forEach((c) => c.exitCode === null && c.kill('SIGTERM'));
    for (const i of [0, 1]) {
      try {
        pm2(i, ['kill']);
      } catch {}
      rmSync(pm2Home(i), { force: true });
    }
  };
  process.once('exit', stopAll);

  if (!existsSync(join(APP, 'build', 'index.html')) && !existsSync(join(APP, 'dist', 'build', 'index.html'))) {
    log('[run] building the admin (strapi build)');
    execFileSync(strapiBin, ['build'], { cwd: APP, env, stdio: ['ignore', 'ignore', 'ignore'] });
  }
  const health = async (port) => {
    try {
      return (await fetch(`http://127.0.0.1:${port}/_health`)).status === 204;
    } catch {
      return false;
    }
  };

  log('[run] first boot on one plain process (schema sync + synthetic seed)');
  {
    const seeder = spawn(strapiBin, ['start'], {
      cwd: APP,
      env: { ...env, PORT: String(PORTS[0]), NODE_OPTIONS: `-r "${join(APP, 'block-egress.cjs')}"` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(seeder);
    const out = createWriteStream(join(APP, 'logs', 'seed.log'));
    seeder.stdout.pipe(out);
    seeder.stderr.pipe(out);
    for (let i = 0; i < 180 && seeder.exitCode === null && !(existsSync(seedOut) && (await health(PORTS[0]))); i += 1) {
      await sleep(1000);
    }
    seeder.kill('SIGTERM');
    await new Promise((r) => (seeder.exitCode === null ? seeder.once('exit', r) : r()));
  }
  if (!existsSync(seedOut)) {
    check('first boot seeded the app', false, `see ${join(APP, 'logs', 'seed.log')}`);
    return 1;
  }
  const seed = JSON.parse(readFileSync(seedOut, 'utf8'));
  rmSync(seedOut);
  for (const f of ['r0.out.log', 'r0.err.log', 'r1.out.log', 'r1.err.log'])
    rmSync(join(APP, 'logs', f), { force: true });

  log('[run] starting 2 replicas, each its own pm2 daemon in cluster mode with 4 workers');
  for (const i of [0, 1]) {
    rmSync(pm2Dir(i), { recursive: true, force: true });
    rmSync(pm2Home(i), { force: true });
    mkdirSync(pm2Dir(i), { recursive: true });
    symlinkSync(pm2Dir(i), pm2Home(i));
    pm2(i, ['start', 'ecosystem.config.cjs'], {
      PORT: String(PORTS[i]),
      REPLICA_NAME: `r${i}`,
      RAILWAY_REPLICA_ID: `replica-${i}-${randomBytes(4).toString('hex')}`,
      IO_E2E_SEED_OUT: '',
    });
  }
  for (const port of PORTS) for (let i = 0; i < 180 && !(await health(port)); i += 1) await sleep(1000);

  const balancer = createBalancer({ upstreams: PORTS, port: LB });
  await balancer.listen();
  const BASE = `http://127.0.0.1:${LB}`;
  log(`[run] round-robin balancer on ${LB} -> ${PORTS.join(', ')} (no stickiness, X-Real-IP overwritten)`);

  // Documentation-range addresses, sent to the balancer only.
  const IP = {
    main: '198.51.100.10',
    settings: '198.51.100.20',
    cap: '198.51.100.30',
    user: '198.51.100.40',
    attacker: '203.0.113.66',
    other: '203.0.113.77',
  };
  const request = async (method, path, { token, body, ip = IP.main } = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-synthetic-client': ip,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {}
    return { status: res.status, body: json };
  };
  const open = (auth, { ip = IP.main, reconnection = false } = {}) =>
    io(BASE, {
      transports: ['websocket'],
      reconnection,
      reconnectionDelay: 200,
      reconnectionDelayMax: 1000,
      randomizationFactor: 0.2,
      auth,
      forceNew: true,
      timeout: 5000,
      extraHeaders: { 'x-synthetic-client': ip },
    });
  const connect = (auth, opts) =>
    new Promise((done) => {
      const socket = open(auth, opts);
      socket.once('connect', () => done({ socket }));
      socket.once('connect_error', (error) => done({ socket, error }));
    });
  const waitEvent = (sockets, event, match, ms = 8000) =>
    Promise.all(
      sockets.map(
        (socket) =>
          new Promise((done) => {
            const timer = setTimeout(() => done(false), ms);
            const fn = (p) => {
              if (match(p)) {
                clearTimeout(timer);
                socket.off(event, fn);
                done(true);
              }
            };
            socket.on(event, fn);
          })
      )
    ).then((r) => r.filter(Boolean).length);
  const titleOf = (p) => p?.data?.title ?? p?.data?.attributes?.title;
  const nodeRows = async () =>
    (await sql('select node_id, heartbeat_at, stats from plugin_io_nodes order by node_id')).map((row) => ({
      id: row.node_id,
      heartbeatAt: Number(row.heartbeat_at),
      stats: typeof row.stats === 'string' ? JSON.parse(row.stats || '{}') : (row.stats ?? {}),
    }));
  const closeAll = (list) => list.forEach((s) => s.close());
  const until = async (fn, ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end && !(await fn())) await sleep(100);
    return fn();
  };
  /**
   * Waits until all 8 processes wrote a heartbeat after `since` and the
   * heartbeats add up to `expected` connections, then one more poll interval,
   * so every process has re-read those heartbeats. Only then is a process's
   * view of the others exact (see docs/guide/multiple-instances.md).
   */
  const settleConnections = async (expected, since) => {
    let rows = [];
    const ok = () =>
      rows.length === PROCESSES &&
      rows.every((r) => r.heartbeatAt > since) &&
      rows.reduce((s, r) => s + (Number(r.stats.connections) || 0), 0) === expected;
    for (let end = Date.now() + HEARTBEAT_INTERVAL * 3; Date.now() < end; await sleep(250)) {
      rows = await nodeRows();
      if (ok()) break;
    }
    await sleep(POLL_INTERVAL + 500);
    return { settled: ok(), counts: rows.map((r) => Number(r.stats.connections) || 0) };
  };
  /** PUT /io/settings on the latest revision, retried on 409. */
  const saveSettings = async (admin, patch) => {
    let res;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await request('GET', '/io/settings', { token: admin });
      res = await request('PUT', '/io/settings', {
        token: admin,
        body: { revision: current.body?.meta?.revision, ...patch(current.body?.data ?? {}) },
      });
      if (res.status !== 409) break;
    }
    return res;
  };

  try {
    const procs = [0, 1].flatMap((i) =>
      JSON.parse(pm2(i, ['jlist'])).map((p) => ({
        replica: i,
        status: p.pm2_env.status,
        mode: p.pm2_env.exec_mode,
      }))
    );
    check(
      'pm2: 2 daemons x 4 cluster workers online',
      procs.length === PROCESSES && procs.every((p) => p.status === 'online' && p.mode === 'cluster_mode'),
      procs.map((p) => `r${p.replica}:${p.mode}:${p.status}`).join(' ')
    );

    const login = await request('POST', '/admin/login', {
      body: { email: credentials.IO_E2E_EMAIL, password: credentials.IO_E2E_PASSWORD },
    });
    const admin = login.body?.data?.token;
    check('admin login through the balancer', login.status === 200 && Boolean(admin));

    let stats;
    for (let i = 0; i < 30; i += 1) {
      stats = (await request('GET', '/io/stats', { token: admin })).body?.data;
      if (stats?.instances?.count === PROCESSES) break;
      await sleep(1000);
    }
    check(
      'monitoring sees 8 processes, Postgres adapter, no warnings',
      stats?.instances?.count === PROCESSES &&
        stats.instances.adapter === 'postgres' &&
        stats.instances.warnings.length === 0,
      `count=${stats?.instances?.count} adapter=${stats?.instances?.adapter} warnings=${JSON.stringify(stats?.instances?.warnings)}`
    );

    // Presence tokens: issued on one replica, used on the other (the balancer alternates).
    {
      let ok = 0;
      let reuseRefused = 0;
      for (let i = 0; i < 16; i += 1) {
        const session = await request('POST', '/io/presence/session', { token: admin });
        const presenceToken = session.body?.data?.token;
        const first = await connect({ strategy: 'admin-jwt', token: presenceToken });
        if (!first.error) ok += 1;
        const again = await connect({ strategy: 'admin-jwt', token: presenceToken });
        if (again.error?.message === 'Authentication failed') reuseRefused += 1;
        first.socket.close();
        again.socket.close();
      }
      check('presence token issued on replica A works on replica B', ok === 16, `${ok}/16`);
      check(
        'presence token works exactly once across processes',
        reuseRefused === 16,
        `${reuseRefused}/16 reuses refused`
      );
    }

    // Content changes reach clients on all 8 processes.
    {
      const publics = [];
      for (let i = 0; i < 24; i += 1) publics.push((await connect()).socket);
      check(
        '24 websocket-only clients connected through the balancer',
        publics.every((s) => s.connected)
      );
      const spread = await settleConnections(24, Date.now());
      check(
        'clients are spread over all 8 processes (heartbeat table)',
        spread.settled && spread.counts.every((n) => n > 0),
        `per process ${spread.counts.join(',')}`
      );
      stats = (await request('GET', '/io/stats', { token: admin })).body?.data;
      check(
        'monitoring total = sum of all processes = 24',
        stats?.connections?.connected === 24 && stats.connections.byKind.public === 24,
        `connected=${stats?.connections?.connected} byKind=${JSON.stringify(stats?.connections?.byKind)}`
      );
      for (let n = 1; n <= 3; n += 1) {
        const title = `Cluster article ${n}`;
        const wait = waitEvent(publics, 'article:create', (p) => titleOf(p) === title);
        const created = await request('POST', '/api/articles?status=published', {
          token: seed.fullAccessToken,
          body: { data: { title, body: 'Lorem ipsum.' } },
        });
        const got = await wait;
        check(`change #${n} reaches clients on all 8 processes`, created.status === 201 && got === 24, `${got}/24`);
      }
      const testEvent = await request('POST', '/io/test-event', {
        token: admin,
        body: { eventName: 'proof:ping', data: { n: 1 } },
      });
      const got = await waitEvent(publics, 'proof:ping', (p) => p?.n === 1, 5000);
      check(
        'admin test event: cluster-wide recipients and delivery',
        testEvent.body?.data?.recipients === 24 && got === 24,
        `recipients=${testEvent.body?.data?.recipients}, delivered ${got}/24`
      );
      closeAll(publics);
    }

    // Reconnects: an edge drop, then a pm2 rolling reload of one replica.
    {
      const reconnects = new Map();
      const clients = [];
      for (let i = 0; i < 16; i += 1) clients.push(open(undefined, { reconnection: true }));
      const admins = [];
      for (let i = 0; i < 4; i += 1) {
        // Like the admin panel: a fresh one-time presence token for every (re)connect.
        admins.push(
          open(
            (cb) => {
              request('POST', '/io/presence/session', { token: admin }).then((r) =>
                cb({ strategy: 'admin-jwt', token: r.body?.data?.token })
              );
            },
            { reconnection: true }
          )
        );
      }
      const all = [...clients, ...admins];
      all.forEach((s) => s.on('connect', () => reconnects.set(s, (reconnects.get(s) ?? 0) + 1)));
      await until(() => all.every((s) => s.connected), 10_000);
      const dropped = balancer.dropAll();
      const tDrop = Date.now();
      await until(() => all.every((s) => (reconnects.get(s) ?? 0) >= 2 && s.connected), 15_000);
      const back = all.filter((s) => (reconnects.get(s) ?? 0) >= 2 && s.connected).length;
      check(
        'edge drop: clients reconnect through the balancer',
        dropped === 20 && back === 20,
        `dropped ${dropped}, reconnected ${back}/20 in ${Date.now() - tDrop} ms`
      );
      let wait = waitEvent(clients, 'article:create', (p) => titleOf(p) === 'After edge drop');
      let created = await request('POST', '/api/articles?status=published', {
        token: seed.fullAccessToken,
        body: { data: { title: 'After edge drop', body: 'Lorem.' } },
      });
      let got = await wait;
      check(
        'events reach every reconnected client',
        created.status === 201 && got === 16 && admins.every((s) => s.connected),
        `${got}/16 public, admins ${admins.filter((s) => s.connected).length}/4`
      );

      const reasons = {};
      all.forEach((s) => s.on('disconnect', (r) => (reasons[r] = (reasons[r] ?? 0) + 1)));
      const before = new Map(all.map((s) => [s, reconnects.get(s) ?? 0]));
      const tReload = Date.now();
      pm2(0, ['reload', 'io-r0']);
      const reloadMs = Date.now() - tReload;
      await until(() => all.every((s) => s.connected), 20_000);
      await sleep(2000);
      await until(() => all.every((s) => s.connected), 20_000);
      const moved = all.filter((s) => reconnects.get(s) > before.get(s)).length;
      check(
        'pm2 rolling reload of replica 0: its clients reconnect',
        all.every((s) => s.connected) && moved > 0,
        `reload ${reloadMs} ms; ${moved}/20 reconnected; disconnect reasons ${JSON.stringify(reasons)}`
      );
      wait = waitEvent(clients, 'article:create', (p) => titleOf(p) === 'After pm2 reload');
      created = await request('POST', '/api/articles?status=published', {
        token: seed.fullAccessToken,
        body: { data: { title: 'After pm2 reload', body: 'Lorem.' } },
      });
      got = await wait;
      check('events reach every client after the reload', created.status === 201 && got === 16, `${got}/16`);
      closeAll(all);
      let count;
      for (let i = 0; i < 45; i += 1) {
        count = (await request('GET', '/io/stats', { token: admin })).body?.data?.instances?.count;
        if (count === PROCESSES) break;
        await sleep(1000);
      }
      check('after the reload monitoring counts 8 processes again', count === PROCESSES, `count=${count}`);
    }

    // Settings: saved on one process, applied everywhere.
    {
      const saved = await saveSettings(admin, (s) => ({ security: { ...s.security, requireAuthentication: true } }));
      const tSaved = Date.now();
      let refused = 0;
      let lastAt = 0;
      for (let i = 0; i < 32; i += 1) {
        const { socket, error } = await connect(undefined, { ip: IP.settings });
        if (error?.message === 'Authentication required') refused += 1;
        lastAt = Date.now() - tSaved;
        socket.close();
      }
      check(
        'requireAuthentication saved on one process applies on all 8 at once',
        saved.status === 200 && refused === 32,
        `save ${saved.status}; ${refused}/32 handshakes refused within ${lastAt} ms`
      );
      await saveSettings(admin, (s) => ({ security: { ...s.security, requireAuthentication: false } }));
      await sleep(500);
      const back = await connect(undefined, { ip: IP.settings });
      check('turning it off again applies too', !back.error, back.error?.message ?? 'accepted');
      back.socket.close();
    }

    // Concurrent settings saves.
    {
      const base = await request('GET', '/io/settings', { token: admin });
      const rev = base.body.meta.revision;
      const s = base.body.data;
      const [a, b] = await Promise.all([
        request('PUT', '/io/settings', {
          token: admin,
          body: { revision: rev, presence: { enabled: true, showTypingIndicator: false } },
        }),
        request('PUT', '/io/settings', {
          token: admin,
          body: { revision: rev, subscriptions: { enabled: true, maxPerSocket: 42 } },
        }),
      ]);
      const statuses = [a.status, b.status].sort().join();
      const loserIsPresence = a.status === 409;
      const conflict = loserIsPresence ? a : b;
      const retry = await saveSettings(admin, () =>
        loserIsPresence
          ? { presence: { enabled: true, showTypingIndicator: false } }
          : { subscriptions: { enabled: true, maxPerSocket: 42 } }
      );
      const final = (await request('GET', '/io/settings', { token: admin })).body?.data;
      check(
        'two concurrent saves with one revision: one 200, one 409, nothing lost after reload',
        statuses === '200,409' &&
          conflict.body?.error?.details?.currentRevision === rev + 1 &&
          retry.status === 200 &&
          final.presence.showTypingIndicator === false &&
          final.subscriptions.maxPerSocket === 42,
        `statuses ${statuses}, currentRevision=${conflict.body?.error?.details?.currentRevision}, retry ${retry.status}`
      );

      const edits = {
        cors: { origins: ['https://app.example.test'] },
        connection: { ...s.connection, pingInterval: 26000 },
        security: { ...s.security, rateLimiting: { enabled: false, maxEventsPerSecond: 11 } },
        events: { ...s.events, excludeFields: ['proofField'] },
        rolePermissions: { authenticated: { canConnect: true } },
        presence: { enabled: true, showTypingIndicator: true },
        subscriptions: { enabled: false, maxPerSocket: 77 },
        monitoring: { ...s.monitoring, maxEventLogSize: 123 },
      };
      const responses = await Promise.all(
        Object.entries(edits).map(([k, v]) =>
          request('PUT', '/io/settings', { token: admin, body: { [k]: v } }).then((r) => [k, r.status])
        )
      );
      const after = (await request('GET', '/io/settings', { token: admin })).body?.data;
      const present = {
        cors: after.cors.origins[0] === 'https://app.example.test',
        connection: after.connection.pingInterval === 26000,
        security: after.security.rateLimiting.maxEventsPerSecond === 11,
        events: after.events.excludeFields[0] === 'proofField',
        rolePermissions: after.rolePermissions?.authenticated?.canConnect === true,
        presence: after.presence.showTypingIndicator === true,
        subscriptions: after.subscriptions.maxPerSocket === 77,
        monitoring: after.monitoring.maxEventLogSize === 123,
      };
      const lost = responses.filter(([k, st]) => st === 200 && !present[k]).map(([k]) => k);
      check(
        '8 concurrent revision-less saves on different processes: all 200, none lost',
        lost.length === 0 && responses.every(([, st]) => st === 200),
        `${responses.map(([k, st]) => `${k}:${st}`).join(' ')}; lost=${JSON.stringify(lost)}`
      );
      await saveSettings(admin, () => ({ ...s, rolePermissions: {}, cors: { origins: [] } }));
    }

    // Revocation: a blocked user and a deleted API token lose their sockets on every process.
    {
      const reg = await request('POST', '/api/auth/local/register', {
        ip: IP.user,
        body: {
          username: `proof${randomBytes(3).toString('hex')}`,
          email: `proof.${randomBytes(3).toString('hex')}@example.test`,
          password: `Pp1-${secret()}`,
        },
      });
      const sockets = [];
      for (let i = 0; i < 12; i += 1) {
        const r = await connect({ strategy: 'jwt', token: reg.body?.jwt }, { ip: IP.user });
        if (!r.error) sockets.push(r.socket);
      }
      const gone = sockets.map(
        (s) =>
          new Promise((done) => {
            const timer = setTimeout(() => done(false), 8000);
            s.once('disconnect', () => {
              clearTimeout(timer);
              done(true);
            });
          })
      );
      const block = await request(
        'PUT',
        `/content-manager/collection-types/plugin::users-permissions.user/${reg.body?.user?.documentId}`,
        { token: admin, body: { blocked: true } }
      );
      const dropped = (await Promise.all(gone)).filter(Boolean).length;
      const retry = await connect({ strategy: 'jwt', token: reg.body?.jwt }, { ip: IP.user });
      check(
        'blocking a user disconnects their sockets on all processes',
        reg.status === 200 && block.status === 200 && sockets.length === 12 && dropped === 12 && Boolean(retry.error),
        `${dropped}/${sockets.length} disconnected, reconnect: ${retry.error?.message ?? 'accepted'}`
      );
      retry.socket.close();

      const created = await request('POST', '/admin/api-tokens', {
        token: admin,
        body: {
          name: `proof-${randomBytes(3).toString('hex')}`,
          type: 'read-only',
          lifespan: null,
          kind: 'content-api',
        },
      });
      const tokenSockets = [];
      for (let i = 0; i < 12; i += 1) {
        const r = await connect({ strategy: 'api-token', token: created.body?.data?.accessKey });
        if (!r.error) tokenSockets.push(r.socket);
      }
      const gone2 = tokenSockets.map(
        (s) =>
          new Promise((done) => {
            const timer = setTimeout(() => done(false), 8000);
            s.once('disconnect', () => {
              clearTimeout(timer);
              done(true);
            });
          })
      );
      const del = await request('DELETE', `/admin/api-tokens/${created.body?.data?.id}`, { token: admin });
      const dropped2 = (await Promise.all(gone2)).filter(Boolean).length;
      check(
        'deleting an API token disconnects its sockets on all processes',
        del.status === 200 && tokenSockets.length === 12 && dropped2 === 12,
        `${dropped2}/${tokenSockets.length} disconnected`
      );
    }

    // Connection cap: a total over all processes. A process counts the others
    // from their heartbeats, so the check waits until every process has
    // written one after the last change and re-read it (settleConnections).
    // A fixed sleep shorter than heartbeatInterval + pollInterval (13 s) made
    // this step flaky: stale counts refused one of the first 10 and admitted
    // all of the 8 extra connections in 1 of 5 runs.
    {
      const capPut = await saveSettings(admin, (s) => ({ connection: { ...s.connection, maxConnections: 10 } }));
      const idle = await settleConnections(0, Date.now());
      const first = [];
      for (let i = 0; i < 10; i += 1) first.push(await connect(undefined, { ip: IP.cap }));
      const firstOk = first.filter((r) => !r.error).length;
      const busy = await settleConnections(10, Date.now());
      const more = [];
      for (let i = 0; i < 8; i += 1) more.push(await connect(undefined, { ip: IP.cap }));
      const full = more.filter((r) => r.error?.message === 'Server is at capacity. Try again later.').length;
      check(
        'maxConnections=10 is a total over 8 processes (a per-process cap would allow 80)',
        capPut?.status === 200 && idle.settled && busy.settled && firstOk === 10 && full === 8,
        `PUT ${capPut?.status}; before: settled=${idle.settled} counts ${idle.counts.join(',')}; first 10: ${firstOk} accepted; after: settled=${busy.settled} counts ${busy.counts.join(',')}; 8 more: ${full} refused as full; errors ${JSON.stringify([...first, ...more].map((r) => r.error?.message).filter(Boolean))}`
      );
      [...first, ...more].forEach((r) => r.socket.close());
      await saveSettings(admin, (s) => ({ connection: { ...s.connection, maxConnections: 0 } }));
    }

    // Monitoring reset reaches all processes.
    {
      const reset = await request('POST', '/io/reset-stats', { token: admin });
      await settleConnections(0, Date.now());
      const after = (await request('GET', '/io/stats', { token: admin })).body?.data;
      check(
        'reset-stats clears the counters of all 8 processes',
        reset.status === 200 && after?.events?.totalConnections === 0 && after?.events?.totalEvents === 0,
        `totalConnections=${after?.events?.totalConnections} totalEvents=${after?.events?.totalEvents}`
      );
    }

    // The failed-handshake lockout is shared by all processes (per client IP behind the proxy).
    {
      const messages = [];
      for (let i = 0; i < 24; i += 1) {
        const { socket, error } = await connect({ strategy: 'api-token', token: `wrong-${i}` }, { ip: IP.attacker });
        messages.push(error?.message);
        socket.close();
      }
      const firstBlock = messages.findIndex((m) => m?.startsWith('Too many'));
      const afterBlock = messages.slice(firstBlock).filter((m) => m?.startsWith('Too many')).length;
      check(
        'lockout is shared by all 8 processes (20 per minute, not 160)',
        firstBlock >= 19 && firstBlock <= 21 && afterBlock === 24 - firstBlock,
        `first block at attempt ${firstBlock + 1}`
      );
      const blocked = [];
      for (let i = 0; i < 8; i += 1) blocked.push(await connect(undefined, { ip: IP.attacker }));
      const other = [];
      for (let i = 0; i < 8; i += 1) other.push(await connect(undefined, { ip: IP.other }));
      check(
        'the locked-out IP is refused on all processes, other clients are not',
        blocked.every((r) => r.error?.message?.startsWith('Too many')) && other.every((r) => !r.error),
        `refused ${blocked.filter((r) => r.error).length}/8, other accepted ${other.filter((r) => !r.error).length}/8`
      );
      [...blocked, ...other].forEach((r) => r.socket.close());
    }

    // A controller passes a client-supplied socket id to the $io helpers.
    {
      const clients = [];
      for (let i = 0; i < 8; i += 1) clients.push((await connect()).socket);
      let leaked = 0;
      clients.forEach((c) => c.on('proof:secret', () => (leaked += 1)));
      const joins = [];
      const kicks = [];
      for (let i = 0; i < 8; i += 1) {
        joins.push(
          (await request('POST', '/api/proof/join', { body: { socketId: 'io-role-public', room: 'proof-private' } }))
            .body?.result
        );
      }
      await request('POST', '/api/proof/emit', { body: { room: 'proof-private', event: 'proof:secret' } });
      for (let i = 0; i < 8; i += 1) {
        kicks.push(
          (await request('POST', '/api/proof/disconnect', { body: { socketId: 'io-role-public' } })).body?.result
        );
      }
      await sleep(1500);
      check(
        'a room name passed as socket id joins and disconnects nobody on any process',
        joins.every((r) => r === false) &&
          kicks.every((r) => r === false) &&
          leaked === 0 &&
          clients.every((c) => c.connected),
        `joins ${JSON.stringify(joins)}, disconnects ${JSON.stringify(kicks)}, deliveries ${leaked}`
      );
      const exact = [];
      for (const c of clients) {
        exact.push(
          (await request('POST', '/api/proof/join', { body: { socketId: c.id, room: 'proof-exact' } })).body?.result
        );
      }
      await sleep(500);
      const wait = waitEvent(clients, 'proof:hello', () => true, 5000);
      await request('POST', '/api/proof/emit', { body: { room: 'proof-exact', event: 'proof:hello' } });
      const got = await wait;
      const victim = clients[3];
      const gone = new Promise((r) => victim.once('disconnect', r));
      const kick = (await request('POST', '/api/proof/disconnect', { body: { socketId: victim.id } })).body?.result;
      const reason = await Promise.race([gone, sleep(4000).then(() => 'timeout')]);
      await sleep(300);
      check(
        'exact socket ids work from any process (join 8/8, disconnect exactly one)',
        exact.every((r) => r === true) &&
          got === 8 &&
          kick === true &&
          reason !== 'timeout' &&
          clients.filter((c) => c.connected).length === 7,
        `joins ${exact.filter(Boolean).length}/8, delivered ${got}/8, kicked ${kick} (${reason})`
      );
      closeAll(clients);
    }

    // The database drops the adapter connections (restart, failover, idle_session_timeout).
    {
      const procList = () =>
        [0, 1]
          .flatMap((i) =>
            JSON.parse(pm2(i, ['jlist'])).map((p) => `${i}:${p.pid}:${p.pm2_env.status}:${p.pm2_env.restart_time}`)
          )
          .sort();
      const before = procList();
      const listenPids = async () =>
        (
          await sql(
            `select pid from pg_stat_activity where datname='${args.db}' and application_name='strapi-plugin-io' and query like 'LISTEN%' order by pid`
          )
        ).map((r) => r.pid);
      const oldListen = await listenPids();
      const [{ count: killed }] = await sql(
        `select count(*) from (select pg_terminate_backend(pid) from pg_stat_activity where datname='${args.db}' and application_name='strapi-plugin-io') t`
      );
      const tKill = Date.now();
      let fresh = [];
      for (let i = 0; i < 100; i += 1) {
        fresh = await listenPids();
        if (fresh.length === PROCESSES && fresh.every((pid) => !oldListen.includes(pid))) break;
        await sleep(100);
      }
      const recoveredMs = Date.now() - tKill;
      await sleep(2000);
      const after = procList();
      check(
        'terminating every adapter connection crashes no process (same pids, no restarts)',
        oldListen.length === PROCESSES &&
          JSON.stringify(before) === JSON.stringify(after) &&
          after.every((p) => p.includes(':online:')),
        `terminated ${killed} backends (${oldListen.length} LISTEN)`
      );
      check(
        'all 8 adapters LISTEN again on new connections',
        fresh.length === PROCESSES && fresh.every((pid) => !oldListen.includes(pid)),
        `${fresh.length}/8 within ${recoveredMs} ms`
      );
      const clients = [];
      for (let i = 0; i < 16; i += 1) clients.push((await connect()).socket);
      await sleep(500);
      const wait = waitEvent(clients, 'article:create', (p) => titleOf(p) === 'After adapter reconnect');
      const created = await request('POST', '/api/articles?status=published', {
        token: seed.fullAccessToken,
        body: { data: { title: 'After adapter reconnect', body: 'Lorem ipsum.' } },
      });
      const got = await wait;
      await request('POST', '/io/test-event', { token: admin, body: { eventName: 'proof:after', data: { n: 2 } } });
      const got2 = await waitEvent(clients, 'proof:after', (p) => p?.n === 2, 5000);
      check(
        'after the reconnect changes reach clients on all 8 processes again',
        created.status === 201 && got === 16 && got2 === 16,
        `content event ${got}/16, test event ${got2}/16`
      );
      closeAll(clients);
    }
    log(
      `[run] balancer distribution: http ${JSON.stringify(balancer.stats.http)} upgrade ${JSON.stringify(balancer.stats.upgrade)}`
    );
  } catch (error) {
    check('run completed', false, error?.stack ?? error?.message);
  } finally {
    await balancer.close();
    stopAll();
    process.off('exit', stopAll);
    await sleep(3000);
    const logs = ['r0.out.log', 'r0.err.log', 'r1.out.log', 'r1.err.log']
      .map((f) => (existsSync(join(APP, 'logs', f)) ? readFileSync(join(APP, 'logs', f), 'utf8') : ''))
      .join('\n');
    const expected = (l) =>
      /\[io\] Socket\.IO postgres adapter error: terminating connection due to administrator command/.test(l);
    const errors = logs
      .split('\n')
      .filter((l) => !expected(l) && /(\[io\].*(failed|error))|TypeError|Unhandled|ERR_/i.test(l));
    check('no plugin errors in the 8 process logs', errors.length === 0, errors.slice(0, 5).join(' | '));
  }
  const failed = results.filter((r) => !r.ok).length;
  log(`[run ${pass}/${RUNS}] ${results.length - failed}/${results.length} passed`);
  return failed;
}

let failedRuns = 0;
for (let pass = 1; pass <= RUNS; pass += 1) {
  if ((await acceptance(pass)) > 0) failedRuns += 1;
}
log(`[cluster] ${RUNS - failedRuns}/${RUNS} runs passed; app and logs in ${APP}`);
process.exit(failedRuns ? 1 : 0);
