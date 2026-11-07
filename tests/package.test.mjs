import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
  assert.equal(pkg.engines.node, '>=22.0.0 <=26.x.x');
  assert.equal(pkg.peerDependencies['@strapi/design-system'], '^2.2.0');
  assert.equal(pkg.peerDependenciesMeta, undefined, 'DS and icons are required peers');
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
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/from '([^'.][^']*)'/g)) {
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
});
