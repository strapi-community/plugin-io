import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const dir = fileURLToPath(new URL('../.github/workflows/', import.meta.url));
const workflows = readdirSync(dir)
  .filter((f) => f.endsWith('.yml'))
  .map((f) => [f, readFileSync(dir + f, 'utf8')]);
const script = fileURLToPath(new URL('../scripts/e2e-app.mjs', import.meta.url));

test('every action is pinned to a full commit SHA', () => {
  for (const [file, text] of workflows) {
    for (const [, ref] of text.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)) {
      assert.match(ref, /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/, `${file}: ${ref}`);
    }
  }
});

test('CI is read-only and runs the e2e suites against a scaffolded Strapi app on Node 22 and 24', () => {
  const ci = workflows.find(([f]) => f === 'ci.yml')[1];
  assert.match(ci, /^permissions:\n {2}contents: read$/m);
  assert.doesNotMatch(ci, /pull_request_target/);
  const e2e = ci.slice(ci.indexOf('\n  e2e:'));
  assert.match(e2e, /node: \['22', '24'\]/);
  assert.match(e2e, /npx playwright install --with-deps chromium/);
  assert.match(e2e, /node scripts\/e2e-app\.mjs/);
  assert.match(e2e, /persist-credentials: false/);
  assert.match(e2e, /tests\/e2e\/app\/package-lock\.json/);
});

test('CI runs the e2e suites on the current Strapi version and on the declared peer floor', () => {
  const ci = workflows.find(([f]) => f === 'ci.yml')[1];
  const e2e = ci.slice(ci.indexOf('\n  e2e:'));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const floor = /^\^(\d+\.\d+\.\d+)$/.exec(pkg.peerDependencies['@strapi/strapi'])?.[1];
  assert.ok(floor, 'the @strapi/strapi peer is a caret range');
  const pinned = /const STRAPI_VERSION = '(\d+\.\d+\.\d+)';/.exec(readFileSync(script, 'utf8'))?.[1];
  // `strapi` must be a base matrix key: an include entry that only adds a new
  // key merges into the matching Node job instead of adding a combination.
  assert.match(e2e, new RegExp(`\\n {8}strapi: \\['${pinned.replaceAll('.', '\\.')}'\\]\\n`));
  assert.match(
    e2e,
    new RegExp(`include:\\n {10}- node: '\\d+'\\n {12}strapi: '${floor.replaceAll('.', '\\.')}'\\n`),
    `e2e matrix tests the peer floor ${floor}`
  );
  assert.match(e2e, /--strapi "\$\{\{ matrix\.strapi \}\}"/);
});

test('CI runs the multi-process suites against PostgreSQL and SQLite', () => {
  const ci = workflows.find(([f]) => f === 'ci.yml')[1];
  const verify = ci.slice(ci.indexOf('\n  verify:'), ci.indexOf('\n  e2e:'));
  assert.match(verify, /image: postgres:16[.\d]*-alpine@sha256:[0-9a-f]{64}\n/, 'service image pinned by digest');
  assert.match(verify, /IO_TEST_PG_URL: postgres:\/\/[^@]+@127\.0\.0\.1:5432\//);
  assert.match(verify, /npm rebuild better-sqlite3/);
});

test('the e2e app installs from its committed lockfile with lifecycle scripts off', () => {
  const source = readFileSync(script, 'utf8');
  assert.match(source, /'ci',\s*'--ignore-scripts'/);
  assert.match(source, /\['rebuild', 'better-sqlite3'\]/);
  const lock = JSON.parse(readFileSync(new URL('../tests/e2e/app/package-lock.json', import.meta.url), 'utf8'));
  assert.equal(lock.lockfileVersion, 3);
  const pinned = /const STRAPI_VERSION = '(\d+\.\d+\.\d+)';/.exec(source)?.[1];
  assert.equal(pinned, '5.62.0');
  assert.equal(lock.packages[''].dependencies['@strapi/strapi'], pinned);
  assert.equal(lock.packages['node_modules/@strapi/strapi'].version, pinned);
  assert.ok(lock.packages['node_modules/@strapi-community/plugin-io'], 'plugin entry');
  assert.ok(lock.packages['node_modules/better-sqlite3'].hasInstallScript);
});

test('the e2e runner refuses reserved ports and app folders inside the repository', () => {
  const port = spawnSync(process.execPath, [script, '--port', '1337'], { encoding: 'utf8' });
  assert.equal(port.status, 2);
  const inside = spawnSync(process.execPath, [script, '--dir', 'tests/e2e/app'], { encoding: 'utf8' });
  assert.equal(inside.status, 2);
  const range = spawnSync(process.execPath, [script, '--strapi', '^5.38.0'], { encoding: 'utf8' });
  assert.equal(range.status, 2, 'only exact Strapi versions');
  const lockOther = spawnSync(process.execPath, [script, '--strapi', '5.38.0', '--update-lock'], { encoding: 'utf8' });
  assert.equal(lockOther.status, 2, 'the committed lockfile is only for STRAPI_VERSION');
});

const cluster = fileURLToPath(new URL('../scripts/cluster-acceptance.mjs', import.meta.url));

test('the cluster acceptance run refuses missing PostgreSQL, reserved ports, bad names and folders in the repo', () => {
  const env = { ...process.env, IO_CLUSTER_PG_URL: '' };
  const run = (...args) => spawnSync(process.execPath, [cluster, ...args], { encoding: 'utf8', env });
  const pg = ['--pg', 'postgres://user@127.0.0.1:1/postgres'];
  assert.equal(run().status, 2, 'needs --pg');
  assert.equal(run(...pg, '--ports', '1337,1392').status, 2);
  assert.equal(run(...pg, '--lb', '1338').status, 2);
  assert.equal(run(...pg, '--db', 'x; drop table y').status, 2);
  assert.equal(run(...pg, '--runs', '0').status, 2);
  assert.equal(run(...pg, '--dir', 'tests/cluster/app').status, 2);
});

test('the cluster acceptance run settles heartbeats before the cap check and prints no secrets', () => {
  const source = readFileSync(cluster, 'utf8');
  assert.match(source, /settleConnections\(0, Date\.now\(\)\)[\s\S]*settleConnections\(10, Date\.now\(\)\)/);
  assert.match(source, /await sleep\(POLL_INTERVAL \+ 500\)/, 'one poll interval after the heartbeats');
  assert.doesNotMatch(source, /console\.log\([^)]*(PASSWORD|SECRET|accessKey|fullAccessToken)/);
  assert.match(source, /randomBytes\(24\)/, 'per-run secrets');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['test:cluster'], 'node scripts/cluster-acceptance.mjs');
  for (const f of ['ecosystem.config.cjs', 'server.cjs', 'config/database.js', 'config/plugins.js']) {
    assert.ok(readFileSync(new URL(`../tests/cluster/app/${f}`, import.meta.url), 'utf8').length > 0, f);
  }
});
