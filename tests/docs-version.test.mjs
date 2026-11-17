/**
 * Documentation drift checks.
 *
 * package.json is the single source of truth for the plugin version, the
 * supported Node.js range and the Strapi peer floor. semantic-release bumps
 * the version on every release, so the docs never hard-code it: the VitePress
 * nav and the JSON-LD `softwareVersion` read package.json at build time, and
 * the compatibility claims below are compared with package.json.
 *
 * The 6.0.0 site showed "v5.8.2" in the nav and `softwareVersion: "5.8.2"`
 * because both were string literals in docs/.vitepress.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const docsRoot = join(root, 'docs');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/**
 * Lists files below a directory, skipping dependencies and VitePress output.
 *
 * @param {string} dir - Absolute directory path.
 * @param {(file: string) => boolean} keep - Filter applied to each file path.
 * @returns {string[]} Absolute file paths.
 */
function walk(dir, keep) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'cache') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, keep));
    else if (keep(full)) out.push(full);
  }
  return out;
}

/** README, CONTRIBUTING, every Markdown/text/JSON page and the VitePress config sources. */
const docFiles = [
  join(root, 'README.md'),
  join(root, 'CONTRIBUTING.md'),
  ...walk(docsRoot, (file) => /\.(md|txt|json|js|mjs)$/.test(file) && !/package(-lock)?\.json$/.test(file)),
];

/**
 * @param {string} file - Absolute path.
 * @returns {string} Path relative to the repository root, for assertion messages.
 */
const rel = (file) => relative(root, file);

/**
 * Collects regex matches across all documentation files.
 *
 * @param {RegExp} pattern - Global regular expression.
 * @param {(match: RegExpMatchArray) => boolean} [isProblem] - Decides whether a match is a finding.
 * @returns {string[]} Findings as `file: text`.
 */
function findAll(pattern, isProblem = () => true) {
  const findings = [];
  for (const file of docFiles) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
      if (isProblem(match)) findings.push(`${rel(file)}: ${match[0].trim()}`);
    }
  }
  return findings;
}

/**
 * Turns the engines range `^22.21.0 || >=24.9.0 <=26.x.x` into the wording the docs use.
 *
 * @param {string} range - package.json engines.node.
 * @returns {string} For example `22.21+ or 24.9+`.
 */
function nodeFloors(range) {
  const floors = [...range.matchAll(/(?:\^|>=)(\d+)\.(\d+)\.\d+/g)].map(([, major, minor]) => `${major}.${minor}+`);
  assert.ok(floors.length > 0, `cannot read the Node.js floors from ${range}`);
  return floors.join(' or ');
}

const strapiFloor = /^\^(\d+\.\d+)\.\d+$/.exec(pkg.peerDependencies['@strapi/strapi'])?.[1];
const e2eStrapi = /const STRAPI_VERSION = '(\d+\.\d+)\.\d+';/.exec(
  readFileSync(join(root, 'scripts/e2e-app.mjs'), 'utf8')
)?.[1];

test('the docs never hard-code the plugin version', () => {
  const findings = [
    ...findAll(/\b(?:plugin|package)\s+version\**\s*[:|]\**\s*v?\d+\.\d+\.\d+/gi),
    ...findAll(/\bsoftwareVersion\b['"]?\s*:\s*['"`]\d/g),
    ...findAll(/\bconst\s+VERSION\s*=\s*['"`]v?\d/g),
    ...findAll(/\btext:\s*['"`]v\d+\.\d+/g),
    ...findAll(/^\s*"version"\s*:/gm),
  ];
  assert.deepEqual(findings, [], 'read the version from package.json instead');
});

test('the VitePress nav and the JSON-LD use the package.json version', async () => {
  const { PLUGIN_VERSION, generateStructuredData } = await import(
    pathToFileURL(join(docsRoot, '.vitepress/structured-data.js')).href
  );
  assert.equal(PLUGIN_VERSION, pkg.version);
  const schemas = generateStructuredData({
    relativePath: 'index.md',
    frontmatter: {},
    pageTitle: 'Home',
    pageDescription: 'Home',
    canonicalUrl: 'https://strapi-community.github.io/plugin-io/',
  });
  const software = schemas.find((schema) => schema['@type'] === 'SoftwareApplication');
  assert.equal(software?.softwareVersion, pkg.version);

  const config = readFileSync(join(docsRoot, '.vitepress/config.js'), 'utf8');
  assert.match(config, /import \{ PLUGIN_VERSION as VERSION[,\s]/, 'config.js takes VERSION from structured-data.js');
  assert.match(config, /text: `v\$\{VERSION\}`/, 'the nav shows VERSION');
});

test('the docs site is rebuilt after every release', () => {
  const workflow = readFileSync(join(root, '.github/workflows/docs.yml'), 'utf8');
  assert.match(workflow, /workflow_run:\n\s+workflows: \[Release\]\n\s+types: \[completed\]\n\s+branches: \[main\]/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  const release = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
  assert.match(release, /^name: Release$/m, 'docs.yml refers to the Release workflow by name');
});

test('Node.js and Strapi requirements in the docs match package.json', () => {
  assert.ok(strapiFloor, 'the @strapi/strapi peer is a caret range');
  const node = nodeFloors(pkg.engines.node);
  const pages = ['README.md', 'docs/index.md', 'docs/guide/getting-started.md', 'docs/public/llms.txt'];
  for (const page of pages) {
    const text = readFileSync(join(root, page), 'utf8');
    assert.ok(text.includes(node), `${page} names Node.js ${node} (engines ${pkg.engines.node})`);
    assert.ok(text.includes(`${strapiFloor} or later`), `${page} names Strapi ${strapiFloor} or later`);
  }
  const migration = readFileSync(join(docsRoot, 'guide/migration.md'), 'utf8');
  const major = pkg.version.split('.')[0];
  assert.match(migration, new RegExp(`\\| ${major}\\.x +\\| ${strapiFloor.replace('.', '\\.')} or later \\|`));
  assert.match(migration, /\| Current +\|/);
  // The pre-6.0 Node.js 18 to 22 range belongs to the 5.x row only.
  assert.deepEqual(
    findAll(/Node\.js 18\s*[–-]\s*22/g),
    [],
    'stale Node.js 18–22 compatibility claim (the current range comes from engines.node)'
  );
});

test('"tested with" claims match the Strapi version CI tests against', () => {
  assert.ok(e2eStrapi, 'scripts/e2e-app.mjs pins STRAPI_VERSION');
  const wrong = findAll(/tested with (\d+\.\d+)/g, (match) => match[1] !== e2eStrapi);
  assert.deepEqual(wrong, [], `CI tests Strapi ${e2eStrapi} (scripts/e2e-app.mjs)`);
});

test('docs/public/llms-full.txt matches the Markdown pages', async () => {
  const { buildLlmsFull } = await import(pathToFileURL(join(docsRoot, '.vitepress/build-llms-full.js')).href);
  const dir = mkdtempSync(join(tmpdir(), 'io-llms-'));
  try {
    const out = join(dir, 'llms-full.txt');
    await buildLlmsFull(docsRoot, out);
    const withoutTimestamp = (text) => text.replace(/ Generated: \S+/, '');
    assert.equal(
      withoutTimestamp(readFileSync(join(docsRoot, 'public/llms-full.txt'), 'utf8')),
      withoutTimestamp(readFileSync(out, 'utf8')),
      'run the docs build (npm run docs:build) and commit docs/public/llms-full.txt'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
