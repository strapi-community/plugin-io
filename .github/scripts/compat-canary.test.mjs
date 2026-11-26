/**
 * Unit tests for the compatibility canary. Run with `node --test .github/scripts/`.
 * Fixtures: trimmed copies of nodejs.org/dist/index.json and nodejs/Release schedule.json
 * (2026-11-26), a synthetic abbreviated npm document, an Actions jobs list and a job log.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  MARKERS,
  applyGuards,
  bumpAppPins,
  classifyJobs,
  compareVersions,
  describeAction,
  excerptLog,
  failureTitle,
  parseVersion,
  planReport,
  proposalText,
  readMarker,
  redact,
  satisfies,
  selectNode,
  selectStrapi,
  shiftMinor,
  stateBody,
  strapiPackages,
  whatsNew,
  writeMarker,
} from './compat-canary.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, 'fixtures', 'compat-canary');
const text = (name) => readFileSync(path.join(fixtures, name), 'utf8');
const load = (name) => JSON.parse(text(name));

const TODAY = '2026-11-26';
const RUN = 'https://github.com/example/plugin/actions/runs/1';
const node = (version, reasons = ['supported LTS'], inEngines = true) => ({
  version,
  major: Number(version.split('.')[0]),
  lts: null,
  reasons,
  inEngines,
});
const CURRENT = {
  strapi: '5.65.0',
  newerMajor: null,
  nodes: [node('22.23.5'), node('24.22.3'), node('26.13.1', ['newest release', 'newest LTS'])],
};

test('parses and compares versions', () => {
  assert.deepEqual(parseVersion('v26.13.1'), { major: 26, minor: 13, patch: 1, pre: '' });
  assert.equal(parseVersion('27.0.0-alpha.0.2.0').pre, 'alpha.0.2.0');
  assert.equal(parseVersion('latest'), null);
  assert.ok(compareVersions('5.64.0', '5.65.0') < 0);
  assert.ok(compareVersions('5.65.0', '5.65.0-beta.1') > 0);
  assert.equal(compareVersions('v22.1.0', '22.1.0'), 0);
  assert.throws(() => compareVersions('x', '1.0.0'), RangeError);
});

test('satisfies every engines.node range used in the fleet', () => {
  const cases = [
    [
      '^22.22.2 || >=24.15.0',
      { '22.23.5': true, '22.22.1': false, '24.22.3': true, '24.14.0': false, '26.13.1': true },
    ],
    ['>=22.12.0 <=26.x.x', { '22.23.5': true, '22.11.0': false, '26.13.1': true, '27.0.0': false }],
    ['^22.21.0 || >=24.9.0 <=26.x.x', { '22.23.5': true, '23.11.1': false, '27.1.0': false }],
    ['>=22.0.0 <=26.x.x', { '22.0.0': true, '20.20.2': false, '26.99.0': true }],
    ['22.x', { '22.23.5': true, '24.22.3': false }],
    ['>=20.0.0 <=26.x.x', { '20.20.2': true, '27.0.0': false }],
    ['*', { '27.0.0': true }],
    ['~24.9', { '24.9.3': true, '24.10.0': false }],
    ['>= 22 < 26', { '25.9.0': true, '26.0.0': false }],
  ];
  for (const [range, expected] of cases) {
    for (const [version, want] of Object.entries(expected)) {
      assert.equal(satisfies(version, range), want, `${version} in ${range}`);
    }
  }
  assert.throws(() => satisfies('22.0.0', '22.0.0 - 24.0.0'), RangeError);
});

test('selects dist-tags.latest when it is a usable 5.x release', () => {
  const picked = selectStrapi(load('strapi-meta.json'));
  assert.deepEqual(picked, {
    version: '5.64.0',
    latestTag: '5.64.0',
    newerMajor: null,
    forced: false,
  });
});

test('keeps to the newest non-deprecated 5.x when latest moves to a new major', () => {
  const meta = load('strapi-meta.json');
  meta['dist-tags'].latest = '6.0.0';
  meta.versions['6.0.0'] = {};
  meta.versions['5.64.1'] = { deprecated: 'broken' };
  const picked = selectStrapi(meta);
  assert.equal(picked.version, '5.64.0');
  assert.equal(picked.newerMajor, '6.0.0');
});

test('a forced Strapi version must be published', () => {
  const meta = load('strapi-meta.json');
  assert.equal(selectStrapi(meta, '5.63.0').version, '5.63.0');
  assert.equal(selectStrapi(meta, '5.63.0').forced, true);
  assert.throws(() => selectStrapi(meta, '5.99.0'), /not published/);
  assert.throws(() => selectStrapi({ versions: { '4.26.2': {} }, 'dist-tags': {} }), /no usable/);
});

test('selects the newest release, the newest LTS and every supported LTS line in engines', () => {
  const nodes = selectNode({
    index: load('node-index.json'),
    schedule: load('node-schedule.json'),
    engines: '^22.22.2 || >=24.15.0',
    today: TODAY,
  });
  assert.deepEqual(
    nodes.map((n) => [n.version, n.reasons.join('+'), n.inEngines]),
    [
      ['22.23.5', 'supported LTS', true],
      ['24.22.3', 'supported LTS', true],
      ['26.13.1', 'newest release+newest LTS+supported LTS', true],
    ]
  );
});

test('ignores prereleases and end-of-life lines, and marks new lines outside engines', () => {
  const index = load('node-index.json');
  index.unshift({ version: 'v27.1.0', lts: false });
  const nodes = selectNode({
    index,
    schedule: load('node-schedule.json'),
    engines: '>=22.12.0 <=26.x.x',
    today: TODAY,
  });
  assert.deepEqual(
    nodes.map((n) => [n.version, n.inEngines]),
    [
      ['22.23.5', true],
      ['24.22.3', true],
      ['26.13.1', true],
      ['27.1.0', false],
    ]
  );
  assert.ok(!nodes.some((n) => n.major === 20 || n.major === 25 || n.major === 23));
});

test('falls back to the LTS flags when the release schedule is unavailable', () => {
  const nodes = selectNode({
    index: load('node-index.json'),
    schedule: null,
    engines: '22.x',
    today: TODAY,
  });
  assert.deepEqual(
    nodes.map((n) => [n.version, n.inEngines]),
    [
      ['22.23.5', true],
      ['26.13.1', false],
    ]
  );
});

test('a manual run can force Node versions or majors', () => {
  const input = { index: load('node-index.json'), schedule: null, engines: '*', today: TODAY };
  const nodes = selectNode({ ...input, forced: '24, 26.13.0' });
  assert.deepEqual(
    nodes.map((n) => [n.version, n.reasons[0]]),
    [
      ['24.22.3', 'forced'],
      ['26.13.0', 'forced'],
    ]
  );
  assert.throws(() => selectNode({ ...input, forced: '19' }), /not in the nodejs.org index/);
  assert.throws(() => selectNode({ ...input, forced: '26.99.0' }), /not in the nodejs.org index/);
});

test('lists the Strapi core packages of package.json at one version', () => {
  const pkg = {
    peerDependencies: { '@strapi/strapi': '^5.50.0', '@strapi/design-system': '^2.0.0' },
    devDependencies: {
      '@strapi/strapi': '^5.64.0',
      '@strapi/plugin-users-permissions': '5.64.0',
      '@strapi/sdk-plugin': '^6.1.1',
      '@strapi/icons': '^2.3.1',
      '@strapi/typescript-utils': '~5.63.0',
      react: '^18.0.0',
    },
  };
  assert.deepEqual(strapiPackages(pkg, '5.65.0'), [
    '@strapi/plugin-users-permissions@5.65.0',
    '@strapi/strapi@5.65.0',
    '@strapi/typescript-utils@5.65.0',
  ]);
  assert.deepEqual(strapiPackages({}, '5.65.0'), ['@strapi/strapi@5.65.0']);
});

test('shifts version mentions after a guard bump without double shifting', () => {
  const before = "Strapi 5.50 to 5.64; '5.64.3' ok, '5.65.0' untested; 15.64, 5.640 stay";
  const after = "Strapi 5.50 to 5.65; '5.65.3' ok, '5.66.0' untested; 15.64, 5.640 stay";
  assert.equal(shiftMinor(before, 5, 64, 65), after);
  assert.equal(shiftMinor('5.64 and 5.65.0', 5, 64, 67), '5.67 and 5.68.0');
});

const GUARD_CONFIG = {
  guards: [
    {
      name: 'Sign in as another admin',
      file: 'rules.js',
      pattern: 'maxMinor: (\\d+)',
      shift: ['en.json', 'rules.test.js'],
    },
  ],
};
const guardFiles = () => ({
  'rules.js': '// checked in 5.64.0\nconst TESTED = { major: 5, minMinor: 50, maxMinor: 64 };\n',
  'en.json': '{ "msg": "tested with Strapi 5.50 to 5.64" }\n',
  'rules.test.js': "supported('5.64.0'); unsupported('5.65.0');\n",
});

test('raises a version guard and its messages to a new Strapi minor', () => {
  const files = guardFiles();
  const io = { read: (f) => files[f], write: (f, t) => (files[f] = t) };
  const result = applyGuards(GUARD_CONFIG, '5.65.0', io);
  assert.deepEqual(result, {
    raised: [{ name: 'Sign in as another admin', from: 64, to: 65 }],
    files: ['rules.js', 'en.json', 'rules.test.js'],
  });
  assert.match(files['rules.js'], /maxMinor: 65 \}/);
  const note = 'comments in the guard file keep their evidence';
  assert.match(files['rules.js'], /checked in 5\.64\.0/, note);
  assert.equal(files['en.json'], '{ "msg": "tested with Strapi 5.50 to 5.65" }\n');
  assert.equal(files['rules.test.js'], "supported('5.65.0'); unsupported('5.66.0');\n");
});

test('leaves guards alone for covered versions, other majors and dry runs', () => {
  for (const version of ['5.64.2', '5.50.0', '6.0.0']) {
    const files = guardFiles();
    const result = applyGuards(GUARD_CONFIG, version, {
      read: (f) => files[f],
      write: () => assert.fail('write'),
    });
    assert.deepEqual(result, { raised: [], files: [] }, version);
  }
  const files = guardFiles();
  const dry = applyGuards(GUARD_CONFIG, '5.66.1', { read: (f) => files[f] });
  assert.deepEqual(dry.raised, [{ name: 'Sign in as another admin', from: 64, to: 66 }]);
  assert.deepEqual(files, guardFiles(), 'a dry run writes nothing');
  assert.deepEqual(applyGuards({}, '5.66.0', { read: () => '' }), { raised: [], files: [] });
  assert.throws(
    () => applyGuards(GUARD_CONFIG, '5.65.0', { read: () => 'no guard here' }),
    /pattern not found in rules.js/
  );
});

test('bumps the exact @strapi pins of the test app', () => {
  const pkg = {
    dependencies: {
      '@strapi/strapi': '5.64.0',
      '@strapi/database': '5.64.0',
      '@strapi/plugin-cloud': '5.64.0',
      'better-sqlite3': '13.0.3',
      'magic-editor-x': 'file:../plugins/Magic-Editor-X',
    },
    devDependencies: { typescript: '^5.9.3' },
  };
  const result = bumpAppPins(pkg, '5.65.0');
  assert.deepEqual(result, {
    from: '5.64.0',
    changed: ['@strapi/strapi', '@strapi/database', '@strapi/plugin-cloud'],
  });
  assert.equal(pkg.dependencies['better-sqlite3'], '13.0.3');
  assert.deepEqual(bumpAppPins(pkg, '5.65.0').changed, []);
  const ranged = { dependencies: { '@strapi/strapi': '^5.64.0' } };
  assert.throws(() => bumpAppPins(ranged, '5.65.0'), /exact version/);
});

test('markers round-trip and cannot close the HTML comment', () => {
  const marker = writeMarker(MARKERS.state, { note: 'a --> b <c>' });
  assert.ok(!marker.slice(4, -4).includes('-->'));
  assert.deepEqual(readMarker(`text\n${marker}\nmore`, MARKERS.state), { note: 'a --> b <c>' });
  assert.equal(readMarker('no marker', MARKERS.state), null);
  assert.equal(readMarker(`<!-- ${MARKERS.state} {broken -->`, MARKERS.state), null);
  assert.equal(readMarker(marker, MARKERS.failure), null);
});

test('classifies the jobs of a run', () => {
  const { failed, cancelled, total } = classifyJobs(load('jobs-failed.json').jobs, 'Report');
  assert.equal(cancelled, false);
  assert.equal(total, 5);
  assert.deepEqual(
    failed.map((f) => [f.name, f.node, f.step]),
    [
      ['Verify on Node 26.13.1', '26.13.1', 'Tests'],
      ['Strapi boot on Node 24.22.3', '24.22.3', null],
    ]
  );
  const job = { id: 1, name: 'Verify on Node 22.23.5', status: 'completed' };
  const jobs = [{ ...job, conclusion: 'cancelled' }];
  assert.equal(classifyJobs(jobs, 'Report').cancelled, true);
});

test('cuts a redacted excerpt around the first error', () => {
  const excerpt = excerptLog(text('job-log.txt'));
  const lines = excerpt.split('\n');
  assert.ok(lines.length <= 40, `${lines.length} lines`);
  assert.match(excerpt, /not ok 51 - boots on Strapi 5\.65\.0/);
  assert.match(excerpt, /##\[error\]Process completed with exit code 1\./);
  assert.doesNotMatch(excerpt, /s3cr3t|abcdef0123456789|ghp_abc|hunter2/);
  assert.doesNotMatch(excerpt, /~~~/);
  assert.doesNotMatch(excerpt, /^2026-11-23T/m);
  assert.doesNotMatch(excerpt, /cleanup line 5/);
  assert.equal(excerptLog('x'.repeat(10_000)).length <= 4004, true);
});

test('redacts tokens, URL passwords and secret assignments', () => {
  assert.equal(redact('npm_abcdefghijklmnopqrstuvwxyz0123'), '[redacted]');
  assert.equal(redact('authorization: token abc'), 'authorization: token [redacted]');
  assert.equal(redact('redis://user:pw@host:6379'), 'redis://[redacted]@host:6379');
  assert.equal(redact('API_TOKEN_SALT=xyz'), 'API_TOKEN_SALT=[redacted]');
  assert.equal(redact('plain text 5.65.0'), 'plain text 5.65.0');
});

test('describes what is new since the last passing run', () => {
  assert.deepEqual(whatsNew(CURRENT, null), ['no passing run recorded yet']);
  const lastPass = { strapi: '5.64.0', nodes: ['22.23.5', '24.22.3', '26.13.0'] };
  assert.deepEqual(whatsNew(CURRENT, lastPass), ['Strapi 5.64.0 -> 5.65.0', 'Node 26.13.1']);
  const same = { strapi: '5.65.0', nodes: CURRENT.nodes.map((n) => n.version) };
  assert.deepEqual(whatsNew(CURRENT, same), []);
});

test('names the failing versions in the issue title', () => {
  const failed = classifyJobs(load('jobs-failed.json').jobs, 'Report').failed;
  const title = failureTitle(CURRENT, failed);
  assert.equal(title, 'Compatibility: Strapi 5.65.0 / Node 24.22.3, 26.13.1');
  assert.equal(
    failureTitle(CURRENT, [{ node: null }]),
    'Compatibility: Strapi 5.65.0 / Node 22.23.5, 24.22.3, 26.13.1'
  );
  assert.equal(
    failureTitle({ strapi: null, nodes: [] }, [{ node: null }]),
    'Compatibility: canary could not resolve the versions to test'
  );
});

const passState = {
  lastPass: {
    strapi: '5.64.0',
    nodes: ['22.23.5'],
    date: '2026-11-16',
    run: `${RUN}0`,
    outcome: 'pass',
  },
  lastRun: {
    strapi: '5.64.0',
    nodes: ['22.23.5'],
    date: '2026-11-16',
    run: `${RUN}0`,
    outcome: 'pass',
  },
};
const stateIssue = { number: 7, body: stateBody(passState) };
const failedJobs = () =>
  classifyJobs(load('jobs-failed.json').jobs, 'Report').failed.map((job) => ({
    ...job,
    excerpt: 'boom',
  }));
const base = { current: CURRENT, runUrl: RUN, date: TODAY, failed: [] };
const plan = (input) => planReport({ ...base, ...input });

test('a new failure opens one issue and keeps the last pass in the state', () => {
  const { actions, state, news } = plan({
    outcome: 'fail',
    failed: failedJobs(),
    stateIssue,
    openFailures: [],
  });
  assert.deepEqual(
    actions.map((a) => [a.type, a.number ?? null]),
    [
      ['create', null],
      ['state', 7],
    ]
  );
  const [create] = actions;
  assert.equal(create.title, 'Compatibility: Strapi 5.65.0 / Node 24.22.3, 26.13.1');
  assert.match(create.body, /\| Strapi \| 5\.65\.0 \|/);
  assert.match(create.body, /Last passing run \| Strapi 5\.64\.0 \/ Node 22\.23\.5 on 2026-11-16/);
  assert.match(create.body, /\*\*Verify on Node 26\.13\.1\*\*, step "Tests"/);
  assert.match(create.body, /~~~text\nboom\n~~~/);
  assert.ok(create.body.length < 65_536);
  assert.equal(readMarker(create.body, MARKERS.failure).strapi, '5.65.0');
  assert.deepEqual(state.lastPass, passState.lastPass);
  assert.equal(state.lastRun.outcome, 'fail');
  assert.deepEqual(news, ['Strapi 5.64.0 -> 5.65.0', 'Node 24.22.3', 'Node 26.13.1']);
});

test('the same failure next week updates the issue silently', () => {
  const failing = { outcome: 'fail', failed: failedJobs(), stateIssue, openFailures: [] };
  const first = plan(failing).actions[0];
  const open = [{ number: 9, title: first.title, body: first.body }];
  const { actions } = plan({
    outcome: 'fail',
    failed: failedJobs(),
    stateIssue,
    openFailures: open,
  });
  assert.equal(actions[0].type, 'update');
  assert.equal(actions[0].number, 9);
  assert.equal(actions[0].comment, null);
});

test('a changed failure updates the issue with one comment and closes duplicates', () => {
  const failing = { outcome: 'fail', failed: failedJobs(), stateIssue, openFailures: [] };
  const first = plan(failing).actions[0];
  const open = [
    { number: 12, title: 'Compatibility: old', body: first.body },
    { number: 9, title: first.title, body: first.body },
  ];
  const failed = failedJobs().slice(0, 1);
  const { actions } = plan({ outcome: 'fail', failed, stateIssue, openFailures: open });
  assert.deepEqual(
    actions.map((a) => [a.type, a.number]),
    [
      ['update', 9],
      ['close', 12],
      ['state', 7],
    ]
  );
  assert.match(actions[0].comment, /The failure changed/);
  assert.equal(actions[0].title, 'Compatibility: Strapi 5.65.0 / Node 26.13.1');
});

test('a pass closes open failure issues and records the tested versions', () => {
  const open = [{ number: 9, title: 'Compatibility: Strapi 5.65.0 / Node 26.13.1', body: '' }];
  const { actions, state } = plan({ outcome: 'pass', stateIssue, openFailures: open });
  assert.deepEqual(
    actions.map((a) => [a.type, a.number]),
    [
      ['close', 9],
      ['state', 7],
    ]
  );
  assert.match(actions[0].comment, /Passed on Strapi 5\.65\.0/);
  assert.deepEqual(state.lastPass.nodes, ['22.23.5', '24.22.3', '26.13.1']);
  assert.equal(readMarker(actions[1].body, MARKERS.state).lastPass.strapi, '5.65.0');
});

test('the first run creates the state issue', () => {
  const { actions, news } = plan({ outcome: 'pass', stateIssue: null, openFailures: [] });
  assert.deepEqual(actions, [{ type: 'state', number: null, body: actions[0].body }]);
  assert.deepEqual(news, ['no passing run recorded yet']);
});

test('proposal text names the evidence and never claims a merge', () => {
  const raised = [{ name: 'Sign in as another admin', from: 64, to: 65 }];
  const guards = proposalText({
    kind: 'guards',
    current: CURRENT,
    raised,
    files: ['a.js'],
    runUrl: RUN,
  });
  assert.equal(guards.title, 'fix(compat): enable Sign in as another admin on Strapi 5.65');
  assert.match(guards.body, /tested up to 5\.64 -> 5\.65/);
  assert.match(guards.body, new RegExp(`Passing run: ${RUN}`));
  assert.match(guards.body, /never merges/);
  assert.match(guards.commit, /^fix\(compat\): enable .*\n\nCompatibility canary run: /);
  const pin = proposalText({
    kind: 'app-pin',
    current: CURRENT,
    raised: [],
    files: ['test-app/package.json'],
    runUrl: RUN,
  });
  assert.equal(pin.title, 'chore(deps): run the test app on Strapi 5.65.0');
});

test('describes each planned action in one line', () => {
  assert.equal(describeAction({ type: 'create', title: 'T' }), 'open a new issue: T');
  assert.equal(describeAction({ type: 'close', number: 3 }), 'comment on and close #3');
  const quiet = { type: 'update', number: 3, title: 'T', comment: null };
  assert.equal(describeAction(quiet), 'update #3 (body only, no notification): T');
  assert.equal(describeAction({ ...quiet, comment: 'c' }), 'update #3 (with one comment): T');
  assert.equal(describeAction({ type: 'state', number: null }), 'create the closed state issue');
  assert.equal(describeAction({ type: 'state', number: 7 }), 'update the state issue #7');
});

test('a simulated last pass without Node versions renders readably', () => {
  const lastPass = { strapi: '5.63.0', nodes: [], date: 'simulated', run: 'simulated' };
  const simulated = { number: 0, body: stateBody({ lastPass, lastRun: lastPass }) };
  const failing = {
    outcome: 'fail',
    failed: failedJobs(),
    stateIssue: simulated,
    openFailures: [],
  };
  const [create] = plan(failing).actions;
  assert.match(create.body, /Strapi 5\.63\.0 \/ Node \(not recorded\) on simulated/);
});
