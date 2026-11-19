/**
 * Unit tests for the Dependabot dependency gate. Run with `node --test .github/scripts/`.
 * Every hold reason has a fixture-based test, and the pass path is tested end to end.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkBreakingText,
  decide,
  evaluateChecks,
  licenseAllowed,
  minVersion,
  nodeSamples,
  normalizePackPath,
  renderHold,
  route,
  satisfies,
  staticExports,
} from './dependency-gate.mjs';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (name) => JSON.parse(readFileSync(path.join(fixtures, name), 'utf8'));

/**
 * Builds a gate input from the fixtures; `overrides` replace single fields.
 *
 * @param {object} [overrides] Fields to replace.
 * @returns {object} Input for decide().
 */
function input(overrides = {}) {
  return {
    baseLock: load('base-lock.json'),
    headLock: load('head-pass-lock.json'),
    basePkg: load('plugin-package.json'),
    headPkg: load('plugin-package.json'),
    baseSurface: load('surface-base.json'),
    headSurface: load('surface-base.json'),
    prBody: 'Bumps tiny-lib from 1.2.0 to 1.3.0.\n\nRelease notes: fixes a typo.',
    reviewChanges: load('review-pass.json'),
    reviewOutcome: 'success',
    signaturesExit: 0,
    registry: {},
    ...overrides,
  };
}

const codes = (result) => [...new Set(result.reasons.map((r) => r.code))].sort();

test('semver: ranges used by engines and peers', () => {
  assert.equal(satisfies('22.22.2', '^22.22.2 || >=24.15.0'), true);
  assert.equal(satisfies('23.1.0', '^22.22.2 || >=24.15.0'), false);
  assert.equal(satisfies('26.99.0', '>=22.0.0 <=26.x.x'), true);
  assert.equal(satisfies('27.0.0', '>=22.0.0 <=26.x.x'), false);
  assert.equal(satisfies('20.19.0', '>= 18'), true);
  assert.equal(satisfies('0.4.9', '^0.4.1'), true);
  assert.equal(satisfies('0.5.0', '^0.4.1'), false);
  assert.equal(satisfies('1.5.0', '1.2 - 2.3'), true);
  assert.equal(satisfies('2.4.0', '1.2 - 2.3'), false);
  assert.equal(satisfies('5.0.0-beta.1', '^5.0.0'), false);
  assert.equal(satisfies('5.0.0-beta.2', '>=5.0.0-beta.1 <6'), true);
  assert.equal(satisfies('3.0.0', '*'), true);
  assert.equal(satisfies('1.2.3', '~1.2.0'), true);
  assert.equal(satisfies('1.3.0', '~1.2.0'), false);
  assert.throws(() => satisfies('1.0.0', 'latest'), RangeError);
  assert.equal(minVersion('^5.50.0'), '5.50.0');
  assert.equal(minVersion('>=22.12.0 <=26.x.x'), '22.12.0');
  assert.equal(minVersion('^18.0.0 || ^19.0.0'), '18.0.0');
});

test('node samples cover every supported major and the declared floors', () => {
  assert.deepEqual(nodeSamples('^22.22.2 || >=24.15.0'), [
    '22.22.2',
    '22.22.3',
    '22.99.0',
    '24.15.0',
    '24.15.1',
    '24.99.0',
    '25.0.0',
    '25.99.0',
    '26.0.0',
    '26.99.0',
  ]);
  assert.deepEqual(nodeSamples('>=22.12.0 <=26.x.x').slice(0, 3), [
    '22.12.0',
    '22.12.1',
    '22.99.0',
  ]);
});

test('SPDX expressions are evaluated against the allowlist', () => {
  const allow = ['MIT', 'Apache-2.0'];
  assert.equal(licenseAllowed('MIT', allow), true);
  assert.equal(licenseAllowed('(MPL-2.0 OR Apache-2.0)', allow), true);
  assert.equal(licenseAllowed('Apache-2.0 AND LGPL-3.0-or-later', allow), false);
  assert.equal(licenseAllowed('(MIT AND (Apache-2.0 OR GPL-2.0))', allow), true);
  assert.throws(() => licenseAllowed('(MIT', allow), SyntaxError);
});

test('pass: a patch/minor update with nothing dangerous is merged', () => {
  const result = decide(input());
  assert.deepEqual(result.reasons, []);
  assert.equal(result.decision, 'merge');
  assert.deepEqual(result.direct, [
    { name: 'tiny-lib', type: 'dependencies', from: '1.2.0', to: '1.3.0' },
    { name: 'dev-tool', type: 'devDependencies', from: '3.1.0', to: '3.1.1' },
    { name: 'esbuild', type: 'devDependencies', from: '0.25.0', to: '0.25.1' },
  ]);
  assert.ok(
    result.notes.some((note) => note.includes('esbuild@0.25.1 keeps its existing install'))
  );
  assert.ok(result.notes.some((note) => note.includes('mystery@1.0.0: no license detected')));
});

test('hold: a new package with an install script', () => {
  const result = decide(input({ headLock: load('head-install-script-lock.json') }));
  assert.equal(result.decision, 'hold');
  assert.deepEqual(codes(result), ['install-script']);
});

test('hold: more than 15 brand-new packages in one update', () => {
  const result = decide(input({ headLock: load('head-new-packages-lock.json') }));
  assert.deepEqual(codes(result), ['new-packages']);
  assert.match(result.reasons[0].message, /^17 packages are new to the tree \(limit 15\)/);
  assert.equal(
    decide(input({ headLock: load('head-new-packages-lock.json'), maxNewPackages: 20 })).decision,
    'merge'
  );
});

test('hold: a package resolved outside registry.npmjs.org', () => {
  const result = decide(input({ headLock: load('head-registry-lock.json') }));
  assert.deepEqual(codes(result), ['registry']);
});

test('hold: a package without a sha512 integrity hash', () => {
  const headLock = load('head-pass-lock.json');
  delete headLock.packages['node_modules/tiny-helper'].integrity;
  assert.deepEqual(codes(decide(input({ headLock }))), ['integrity']);
});

test('hold: engines.node no longer covers a supported Node version', () => {
  const result = decide(input({ headLock: load('head-engines-lock.json') }));
  assert.deepEqual(codes(result), ['engines']);
  assert.match(
    result.reasons[0].message,
    /tiny-lib@1\.3\.0 declares engines.node ">=24" \(was ">=18"\)/
  );
  assert.match(result.reasons[0].message, /22\.22\.2/);
});

test('hold: npm view data wins over the lockfile copy for engines', () => {
  const registry = { 'tiny-lib@1.3.0': { engines: { node: '^24.0.0' } } };
  const result = decide(input({ registry }));
  assert.deepEqual(codes(result), ['engines']);
  assert.match(result.reasons[0].message, /26\.0\.0/);
});

test('hold: a raised peer dependency the installed tree does not satisfy', () => {
  const result = decide(input({ headLock: load('head-peer-lock.json') }));
  assert.deepEqual(codes(result), ['peer']);
  assert.match(
    result.reasons[0].message,
    /needs peer react@"\^19\.0\.0" \(was ">=17"\).*react@18\.3\.1/
  );
});

test('pass: a package that only moved keeps its earlier engines and peer state', () => {
  const odd = {
    version: '1.0.0',
    resolved: 'https://registry.npmjs.org/odd/-/odd-1.0.0.tgz',
    integrity: 'sha512-b2RkQDEuMC4w',
    dev: true,
    engines: { node: '>=24' },
    peerDependencies: { react: '^17.0.0' },
  };
  const baseLock = load('base-lock.json');
  baseLock.packages['node_modules/dev-tool/node_modules/odd'] = odd;
  const headLock = load('head-pass-lock.json');
  headLock.packages['node_modules/odd'] = odd;
  const result = decide(input({ baseLock, headLock }));
  assert.equal(result.decision, 'merge');
  assert.ok(
    result.notes.some((note) => note.includes('odd@1.0.0: peer react@"^17.0.0" was already'))
  );
});

test('hold: a shipped package needs a peer above the plugin peer floor', () => {
  const result = decide(input({ headLock: load('head-peer-floor-lock.json') }));
  assert.deepEqual(codes(result), ['peer-floor']);
  assert.match(result.reasons[0].message, /@strapi\/strapi@5\.50\.0/);
});

test('hold: a 0.x minor bump of a runtime dependency', () => {
  const result = decide(input({ headLock: load('head-zero-minor-lock.json') }));
  assert.deepEqual(codes(result), ['zero-minor']);
});

test('major: a direct dependency major bump is never merged', () => {
  const result = decide(input({ headLock: load('head-major-lock.json') }));
  assert.equal(result.decision, 'major');
  assert.deepEqual(result.majors, ['tiny-lib 1.2.0 -> 2.0.0']);
});

test('hold: breaking-change wording in the PR body', () => {
  for (const body of [
    '## BREAKING CHANGES\n- drops x',
    'This is a breaking change.',
    'Breaking: y',
  ]) {
    assert.deepEqual(codes(decide(input({ prBody: body }))), ['breaking-text'], body);
  }
  assert.deepEqual(checkBreakingText('A non-breaking fix. Avoids breakingly long lines.'), []);
});

test('hold: the published surface changed', () => {
  const result = decide(input({ headSurface: load('surface-head-changed.json') }));
  assert.deepEqual(codes(result), ['surface']);
  assert.match(result.reasons.map((r) => r.message).join('\n'), /\+dist\/server\/extra\.js/);
  assert.match(result.reasons.map((r) => r.message).join('\n'), /"shapes" changed/);
  assert.deepEqual(codes(decide(input({ headSurface: null }))), ['surface']);
});

test('hold: package.json peerDependencies or engines changed', () => {
  const headPkg = load('plugin-package.json');
  headPkg.engines.node = '>=24.15.0';
  assert.deepEqual(codes(decide(input({ headPkg }))), ['surface']);
});

test('surface: content hashes in chunk names are ignored', () => {
  assert.equal(normalizePackPath('dist/_chunks/App-BfA8aZ0A.mjs'), 'dist/_chunks/App-[hash].mjs');
  assert.equal(
    normalizePackPath('dist/_chunks/en-Bn4C3_gQ.js.map'),
    'dist/_chunks/en-[hash].js.map'
  );
  assert.equal(normalizePackPath('dist/server/index.js'), 'dist/server/index.js');
  assert.deepEqual(
    staticExports('const a = 1;\nexport { a as default, b };\nexport const c = 2;'),
    ['b', 'c', 'default']
  );
});

test('hold: vulnerabilities >= moderate and licenses outside the allowlist', () => {
  const result = decide(input({ reviewChanges: load('review-hold.json') }));
  assert.deepEqual(codes(result), ['license', 'vulnerability']);
  const text = result.reasons.map((r) => r.message).join('\n');
  assert.match(text, /GHSA-0000-0000-0002/);
  assert.match(text, /copyleft-lib@2\.0\.0 \(development scope\) has license "GPL-3\.0-only"/);
  assert.match(text, /mpl-runtime@1\.0\.0 \(runtime scope\) has license "MPL-2\.0"/);
  assert.deepEqual(codes(decide(input({ reviewChanges: null }))), ['dependency-review']);
});

test('hold: dependency-review-action failed or npm audit signatures failed', () => {
  assert.deepEqual(codes(decide(input({ reviewOutcome: 'failure' }))), ['dependency-review']);
  assert.deepEqual(codes(decide(input({ signaturesExit: 1 }))), ['signatures']);
});

test('hold: lockfile version 1 cannot be evaluated', () => {
  const result = decide(input({ headLock: { lockfileVersion: 1, dependencies: {} } }));
  assert.deepEqual(codes(result), ['lockfile']);
});

test('route: only an explicit patch/minor with green jobs and a merge decision merges', () => {
  const ok = {
    updateType: 'version-update:semver-minor',
    verifyResult: 'success',
    gateResult: 'success',
    decision: 'merge',
    reasons: [],
  };
  assert.equal(route(ok).action, 'merge');
  assert.equal(route({ ...ok, updateType: 'version-update:semver-patch' }).action, 'merge');
  assert.equal(route({ ...ok, updateType: 'version-update:semver-major' }).action, 'major');
  assert.equal(route({ ...ok, decision: 'major' }).action, 'major');
  assert.equal(route({ ...ok, updateType: '' }).action, 'hold');
  assert.equal(route({ ...ok, verifyResult: 'failure' }).action, 'hold');
  assert.equal(route({ ...ok, gateResult: 'failure', decision: '' }).action, 'hold');
  const held = route({ ...ok, decision: 'hold', reasons: [{ code: 'peer', message: 'x' }] });
  assert.deepEqual(held, { action: 'hold', reasons: [{ code: 'peer', message: 'x' }] });
  assert.match(renderHold(held.reasons, ['note']), /- `peer`: x/);
});

test('wait-ci: green only when every other workflow and check finished green', () => {
  assert.equal(evaluateChecks(load('checks-green.json')).state, 'success');
  const pending = evaluateChecks(load('checks-pending.json'));
  assert.equal(pending.state, 'pending');
  assert.deepEqual(pending.pending, ['workflow "CI" (pull_request)', 'check "multi-instance"']);
  const failed = evaluateChecks(load('checks-failed.json'));
  assert.equal(failed.state, 'failure');
  assert.ok(failed.failing.includes('check "Admin StrictMode tests on React 19": failure'));
  assert.equal(evaluateChecks(load('checks-superseded.json')).state, 'success');
  const none = { ownWorkflowId: 1, runs: [], checkRuns: [], status: { total_count: 0 } };
  assert.equal(evaluateChecks(none).state, 'pending');
  const status = {
    ...load('checks-green.json'),
    status: { total_count: 1, statuses: [{ context: 'ext', state: 'failure' }] },
  };
  assert.equal(evaluateChecks(status).state, 'failure');
});
