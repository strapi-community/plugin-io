#!/usr/bin/env node
/**
 * Scaffolds a minimal Strapi 5.61 app (SQLite, synthetic content types from
 * tests/e2e/app), installs the packed plugin tarball, starts it and runs the
 * end-to-end suites in tests/e2e (Playwright admin suite, socket and API
 * suite). CI runs exactly this script; run it locally the same way:
 *
 *   npm run build && node scripts/e2e-app.mjs
 *
 * Options:
 *   --dir <path>     App directory, recreated each run (default: a folder in
 *                    the OS temp directory, outside this repository, so the
 *                    app never resolves packages from this repo).
 *   --port <n>       Port (default 1357).
 *   --overrides      Copy this package's npm `overrides` into the app, to
 *                    check that Strapi runs with the patched dependencies.
 *   --keep           Leave the app running after the tests.
 *
 * Secrets, admin passwords and the API token are generated per run, passed
 * through the environment and never printed. Outgoing connections from the
 * app are limited to loopback.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RESERVED_PORTS = new Set([1337, 1338, 1340, 1345, 1351, 1352, 1353, 1354]);
const STRAPI_VERSION = '5.61.0';

const { values: args } = parseArgs({
  options: {
    dir: { type: 'string', default: join(tmpdir(), 'plugin-io-e2e-app') },
    port: { type: 'string', default: '1357' },
    overrides: { type: 'boolean', default: false },
    keep: { type: 'boolean', default: false },
  },
});
const port = Number(args.port);
if (!Number.isInteger(port) || port < 1024 || RESERVED_PORTS.has(port)) {
  console.error(`Refusing port ${args.port}.`);
  process.exit(2);
}
const app = resolve(ROOT, args.dir);
const logs = join(app, 'logs');
if (app === ROOT || app.startsWith(`${ROOT}/`) || ROOT.startsWith(`${app}/`)) {
  console.error('Use an app directory outside this repository.');
  process.exit(2);
}

/**
 * Runs a command and resolves with its exit code. Output goes to a log file
 * when `log` is set, otherwise to this process.
 *
 * @param {string} command - Executable.
 * @param {string[]} commandArgs - Arguments.
 * @param {{ cwd?: string, env?: object, log?: string }} [options] - Options.
 * @returns {Promise<number>} Exit code.
 */
function run(command, commandArgs, { cwd = ROOT, env = process.env, log } = {}) {
  return new Promise((done) => {
    const child = spawn(command, commandArgs, {
      cwd,
      env,
      stdio: log ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      shell: process.platform === 'win32',
    });
    if (log) {
      const chunks = [];
      child.stdout.on('data', (c) => chunks.push(c));
      child.stderr.on('data', (c) => chunks.push(c));
      child.on('close', (code) => {
        writeFileSync(log, Buffer.concat(chunks));
        done(code ?? 1);
      });
    } else {
      child.on('close', (code) => done(code ?? 1));
    }
  });
}

/** Fails the run with a message and the tail of a log file. */
function fail(message, log) {
  console.error(message);
  if (log && existsSync(log)) console.error(readFileSync(log, 'utf8').split('\n').slice(-40).join('\n'));
  process.exit(1);
}

const step = (message) => console.log(`[e2e] ${message}`);

// 1. Fresh app directory with the synthetic fixture. An existing directory is
// only removed when an earlier run created it (marker file) or it is empty.
const MARKER = '.io-e2e-app';
if (existsSync(app)) {
  if (!existsSync(join(app, MARKER)) && readdirSync(app).length > 0) {
    fail(`${app} exists and was not created by this script; choose another --dir.`);
  }
  rmSync(app, { recursive: true, force: true });
}
mkdirSync(join(app, 'pkg'), { recursive: true });
mkdirSync(logs, { recursive: true });
writeFileSync(join(app, MARKER), 'Created by scripts/e2e-app.mjs; removed on the next run.\n');
cpSync(join(ROOT, 'tests/e2e/app'), app, { recursive: true });
cpSync(join(ROOT, 'tests/e2e/block-egress.cjs'), join(app, 'block-egress.cjs'));

// 2. Pack the built plugin (the same tarball npm would publish).
if (!existsSync(join(ROOT, 'dist/server/index.js'))) fail('Run "npm run build" first.');
step('packing the plugin');
if (
  (await run('npm', ['pack', '--ignore-scripts', '--pack-destination', join(app, 'pkg')], {
    log: join(logs, 'pack.log'),
  })) !== 0
) {
  fail('npm pack failed', join(logs, 'pack.log'));
}
const tarball = readdirSync(join(app, 'pkg')).find((f) => f.endsWith('.tgz'));

// 3. package.json pinned to Strapi 5.61 and the plugin's peer versions.
const plugin = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const appPackage = {
  name: 'io-e2e-app',
  private: true,
  version: '0.0.0',
  scripts: {},
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
if (args.overrides) {
  const { 'zod@4.4.3': _ignored, ...overrides } = plugin.overrides ?? {};
  appPackage.overrides = overrides;
}
writeFileSync(join(app, 'package.json'), `${JSON.stringify(appPackage, null, 2)}\n`);

step(`installing Strapi ${STRAPI_VERSION} and the plugin${args.overrides ? ' (with overrides)' : ''}`);
if ((await run('npm', ['install', '--no-audit', '--no-fund'], { cwd: app, log: join(logs, 'install.log') })) !== 0) {
  fail('npm install failed', join(logs, 'install.log'));
}

// 4. Per-run secrets and credentials (never printed).
const secret = () => randomBytes(24).toString('base64url');
const credentials = {
  IO_E2E_EMAIL: 'ada.admin@example.test',
  IO_E2E_PASSWORD: `Aa1-${secret()}`,
  IO_E2E_VIEWER_EMAIL: 'vic.viewer@example.test',
  IO_E2E_VIEWER_PASSWORD: `Vv1-${secret()}`,
};
const seedOut = join(app, '.tmp', 'seed.json');
mkdirSync(dirname(seedOut), { recursive: true });
const appEnv = {
  ...process.env,
  NODE_ENV: 'production',
  STRAPI_TELEMETRY_DISABLED: 'true',
  STRAPI_DISABLE_UPDATE_NOTIFICATION: 'true',
  PORT: String(port),
  APP_KEYS: [secret(), secret()].join(','),
  ADMIN_JWT_SECRET: secret(),
  API_TOKEN_SALT: secret(),
  TRANSFER_TOKEN_SALT: secret(),
  ENCRYPTION_KEY: secret(),
  JWT_SECRET: secret(),
  NODE_OPTIONS: [process.env.NODE_OPTIONS, `-r "${join(app, 'block-egress.cjs')}"`].filter(Boolean).join(' '),
  IO_E2E_SEED_OUT: seedOut,
  ...credentials,
};

step('building the admin');
const strapiBin = join(app, 'node_modules', '.bin', 'strapi');
if ((await run(strapiBin, ['build'], { cwd: app, env: appEnv, log: join(logs, 'build.log') })) !== 0) {
  fail('strapi build failed', join(logs, 'build.log'));
}

// 5. Start the app and wait for /_health and the seed file.
step(`starting the app on 127.0.0.1:${port}`);
const serverLog = join(logs, 'server.log');
const server = spawn(strapiBin, ['start'], { cwd: app, env: appEnv, stdio: ['ignore', 'pipe', 'pipe'] });
const serverOutput = [];
server.stdout.on('data', (c) => serverOutput.push(c));
server.stderr.on('data', (c) => serverOutput.push(c));
const stopServer = () => {
  writeFileSync(serverLog, Buffer.concat(serverOutput));
  if (server.exitCode === null) server.kill('SIGTERM');
};
process.on('exit', () => {
  if (!args.keep) stopServer();
});

const base = `http://127.0.0.1:${port}`;
let ready = false;
for (let i = 0; i < 120 && server.exitCode === null; i += 1) {
  try {
    const res = await fetch(`${base}/_health`);
    if (res.status === 204 && existsSync(seedOut)) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}
if (!ready) {
  stopServer();
  fail('The app did not start.', serverLog);
}
const seed = JSON.parse(readFileSync(seedOut, 'utf8'));
rmSync(seedOut);

// 6. Run the suites against the app.
step('running tests/e2e');
const testEnv = {
  ...process.env,
  IO_E2E_URL: base,
  IO_E2E_TOKEN: seed.fullAccessToken,
  ...credentials,
};
const code = await run(process.execPath, ['--test', '--test-concurrency=1', 'tests/e2e/*.e2e.mjs'], { env: testEnv });

if (args.keep) {
  step(`app left running on ${base} (pid ${server.pid}); logs in ${logs}`);
  writeFileSync(serverLog, Buffer.concat(serverOutput));
  server.unref();
  process.exit(code);
}
stopServer();
const log = Buffer.concat(serverOutput).toString('utf8');
if (/TypeError|Sanitiz\w+ (failed|error)/i.test(log)) {
  console.error('[e2e] The server log contains a TypeError or sanitization error.');
  process.exit(1);
}
process.exit(code);
