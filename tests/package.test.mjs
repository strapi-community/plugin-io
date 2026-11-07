import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));

test('runtime dependencies are declared, so @strapi/utils stays external (#F-08)', () => {
  assert.ok(pkg.dependencies['@strapi/utils']);
  assert.match(pkg.dependencies.zod, /^\^4\./);
  assert.equal(pkg.dependencies['date-fns'], undefined);
  assert.equal(pkg.dependencies.lodash, undefined);
});

test('engines and peers match Strapi 5.61', () => {
  assert.equal(pkg.engines.node, '^22.21.0 || >=24.9.0 <=26.x.x');
  assert.equal(pkg.peerDependencies['@strapi/design-system'], '^2.2.0');
  // Strapi apps get these through @strapi/admin (exact versions), so they
  // are optional peers: no install warning, and no second copy is added.
  for (const name of ['@strapi/design-system', '@strapi/icons', 'react-intl']) {
    assert.ok(pkg.peerDependencies[name], `${name} is a declared peer`);
    assert.equal(pkg.peerDependenciesMeta[name]?.optional, true, `${name} is optional (comes with @strapi/admin)`);
    assert.equal(pkg.dependencies[name], undefined, `${name} is never bundled as a dependency`);
  }
  // Every Strapi app lists these itself (create-strapi-app template), so they stay required.
  for (const name of ['@strapi/strapi', 'react', 'react-dom', 'react-router-dom', 'styled-components']) {
    assert.ok(pkg.peerDependencies[name], `${name} is a declared peer`);
    assert.equal(pkg.peerDependenciesMeta[name], undefined, `${name} is a required peer`);
  }
  for (const name of ['@socket.io/postgres-adapter', '@socket.io/redis-adapter', 'ioredis', 'pg']) {
    assert.ok(pkg.peerDependencies[name], `${name} is a declared peer`);
    assert.equal(pkg.peerDependenciesMeta[name]?.optional, true, `${name} is optional (multi-instance adapters only)`);
  }
});

test('package metadata is complete and points at the docs site', () => {
  assert.match(pkg.description, /^Socket\.IO for Strapi 5: /);
  assert.equal(pkg.strapi.description, pkg.description);
  assert.doesNotMatch(pkg.description, /\b(blazing|ultimate|powerful|seamless|best|enterprise)\b/i, 'no hype');
  assert.equal(pkg.homepage, 'https://strapi-community.github.io/plugin-io/');
  assert.deepEqual(pkg.repository, { type: 'git', url: 'git+https://github.com/strapi-community/plugin-io.git' });
  assert.equal(pkg.bugs.url, 'https://github.com/strapi-community/plugin-io/issues');
  for (const k of ['strapi', 'strapi-plugin', 'strapi-v5', 'socket.io', 'websocket', 'realtime']) {
    assert.ok(pkg.keywords.includes(k), `keyword ${k}`);
  }
  assert.equal(new Set(pkg.keywords).size, pkg.keywords.length, 'no duplicate keywords');
  assert.equal(pkg.author.url, 'https://github.com/ComfortablyCoding');
  assert.equal(existsSync(join(rootDir, 'api-reference.json')), false, 'stale root api-reference.json is gone');
});

test('npm pkg fix has nothing to change', () => {
  const dir = mkdtempSync(join(tmpdir(), 'io-pkg-fix-'));
  try {
    cpSync(join(rootDir, 'package.json'), join(dir, 'package.json'));
    execFileSync('npm', ['pkg', 'fix'], { cwd: dir, stdio: 'ignore' });
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')), pkg);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('types are published and resolvable', () => {
  assert.equal(pkg.types, './types.d.ts');
  assert.equal(pkg.exports['./strapi-server'].types, './types.d.ts');
  assert.ok(pkg.files.includes('types.d.ts'));
});

test('no legacy server tree, root shims or tracked dist', () => {
  for (const legacy of ['server/index.js', 'server/bootstrap', 'strapi-server.js', 'strapi-admin.js', '.eslintrc.js']) {
    assert.equal(existsSync(join(rootDir, legacy)), false, legacy);
  }
  const tracked = execFileSync('git', ['ls-files', 'dist'], { cwd: rootDir, encoding: 'utf8' }).trim();
  assert.equal(tracked, '');
  assert.ok(!readFileSync(join(rootDir, '.gitignore'), 'utf8').includes('package-lock.json'), 'lockfile is committed');
});

test('server sources import no undeclared packages', () => {
  const walk = (d) =>
    readdirSync(d).flatMap((e) => (statSync(join(d, e)).isDirectory() ? walk(join(d, e)) : [join(d, e)]));
  const allowed = new Set([...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]);
  for (const file of walk(join(rootDir, 'server/src')).filter((f) => f.endsWith('.js'))) {
    const source = readFileSync(file, 'utf8');
    const specs = [...source.matchAll(/from '([^'.][^']*)'/g), ...source.matchAll(/load\('([^'.][^']*)'/g)];
    for (const [, spec] of specs) {
      if (spec.startsWith('node:')) continue;
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      assert.ok(allowed.has(name), `${file}: ${spec}`);
    }
  }
});

test('built server bundle keeps @strapi/utils external (when dist exists)', (t) => {
  const bundle = join(rootDir, 'dist/server/index.js');
  if (!existsSync(bundle)) return t.skip('run npm run build first');
  const code = readFileSync(bundle, 'utf8');
  assert.ok(code.includes('require("@strapi/utils")'));
  assert.ok(!/class ApplicationError/.test(code), 'no inlined copy of Strapi error classes');
  assert.ok(statSync(bundle).size < 200_000);
  for (const name of ['@socket.io/postgres-adapter', '@socket.io/redis-adapter', 'ioredis', 'pg']) {
    assert.ok(code.includes(`"${name}"`) || code.includes(`'${name}'`), `${name} is loaded at runtime, not bundled`);
  }
  assert.ok(!code.includes('class PostgresAdapter'), 'no inlined adapter');
});
