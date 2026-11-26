#!/usr/bin/env node
/**
 * Compatibility canary (version 1).
 *
 * One dependency-free script, byte-identical in every plugin repository and in the workbench.
 * The workflow `.github/workflows/canary.yml` calls it once a week (and on manual runs) to test
 * the plugin against the newest Strapi 5.x and the current Node.js release lines, then reports
 * the result as one GitHub issue. The unit tests in `compat-canary.test.mjs` cover version
 * detection, the guard update, the issue plan and the log excerpt.
 *
 * Subcommands:
 * - `detect`        resolves the newest Strapi 5.x and the Node versions to test (job outputs);
 *                   `CANARY_NEWEST_NODE_ONLY=true` keeps only the newest Node release.
 * - `packages <v>`  prints the `@strapi/*` packages of package.json pinned to version `<v>`.
 * - `assert <v>`    fails unless the installed Strapi core packages are version `<v>`.
 * - `guards <v>`    raises the Strapi version guards of `.github/compat-canary.json` to `<v>`.
 * - `bump-app <dir> <v>`  sets the exact `@strapi/*` pins of `<dir>/package.json` to `<v>`.
 * - `report`        reads the job results of this run and opens, updates or closes the issue.
 *
 * State: the last passing and the last run are stored as JSON in the body of one closed issue
 * titled "Compatibility canary state" (label `compat`). Editing a closed issue's body sends no
 * notification, needs only `issues: write`, and survives cache eviction and default-branch
 * protection, which the alternatives (Actions cache, a committed file) do not.
 */
import { execFileSync } from 'node:child_process';
import console from 'node:console';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

/** Label of every issue the canary opens. */
export const LABEL = 'compat';

/** Title of the closed issue that stores the canary state. */
export const STATE_TITLE = 'Compatibility canary state';

/** Title prefix of failure issues. */
export const FAILURE_PREFIX = 'Compatibility: ';

/** Hidden markers in issue bodies (HTML comments with JSON). */
export const MARKERS = Object.freeze({
  state: 'compat-canary:state',
  failure: 'compat-canary:failure',
  proposal: 'compat-canary:proposal',
});

/** Strapi major version the canary follows. A new major needs a human decision. */
export const STRAPI_MAJOR = 5;

/** Longest log excerpt per failed job, in lines and characters. */
const EXCERPT_LINES = 40;
const EXCERPT_CHARS = 4000;

/** Failed jobs that get a log excerpt in the issue (the issue body limit is 65536). */
const MAX_EXCERPTS = 5;

/** Tokens that must never appear in an issue (GitHub and npm token formats). */
const TOKEN_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g, // GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g, // GitHub fine-grained tokens
  /\bnpm_[A-Za-z0-9]{20,}/g, // npm tokens
];

const NODE_INDEX_URL = 'https://nodejs.org/dist/index.json';
const NODE_SCHEDULE_URL = 'https://raw.githubusercontent.com/nodejs/Release/main/schedule.json';
const NPM_REGISTRY = 'https://registry.npmjs.org/';

// ---------------------------------------------------------------------------------------------
// Versions and ranges
// ---------------------------------------------------------------------------------------------

/**
 * Parses `1.2.3`, `v1.2.3` or `1.2.3-rc.1`.
 *
 * @param {unknown} input Version text.
 * @returns {{major: number, minor: number, patch: number, pre: string}|null} Parsed version.
 */
export function parseVersion(input) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(input ?? '').trim());
  if (!match) return null;
  const [major, minor, patch] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return { major, minor, patch, pre: match[4] || '' };
}

/**
 * Compares two versions. A prerelease sorts before its release; prerelease tags compare as text.
 *
 * @param {string} a First version.
 * @param {string} b Second version.
 * @returns {number} Negative, zero or positive.
 * @throws {RangeError} When a version cannot be parsed.
 */
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) throw new RangeError(`invalid version "${!x ? a : b}"`);
  for (const key of ['major', 'minor', 'patch']) {
    if (x[key] !== y[key]) return x[key] - y[key];
  }
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre < y.pre ? -1 : 1;
}

const RANGE_TOKEN = /^(<=|>=|<|>|=|\^|~)?v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?$/;

/**
 * Turns one range token into comparators on `[major, minor, patch]` tuples.
 *
 * @param {string} token For example `^22.22.2`, `>=24.15.0`, `<=26.x.x` or `22.x`.
 * @returns {Array<{op: string, v: number[]}>} Comparators that must all hold.
 * @throws {RangeError} For a token the canary does not understand.
 */
function tokenComparators(token) {
  const match = RANGE_TOKEN.exec(token);
  if (!match) throw new RangeError(`unsupported range token "${token}"`);
  const op = match[1] || '=';
  const wild = (part) => part === undefined || /^[xX*]$/.test(part);
  const M = wild(match[2]) ? null : Number(match[2]);
  const m = wild(match[3]) ? null : Number(match[3]);
  const p = wild(match[4]) ? null : Number(match[4]);
  const from = [M ?? 0, m ?? 0, p ?? 0];
  if (M === null) return op === '<' || op === '>' ? [{ op: '<', v: [0, 0, 0] }] : [];
  // Exclusive upper bound of a partial version: 26 -> 27.0.0, 26.1 -> 26.2.0.
  const next = m === null ? [M + 1, 0, 0] : p === null ? [M, m + 1, 0] : null;
  if (op === '=')
    return next
      ? [
          { op: '>=', v: from },
          { op: '<', v: next },
        ]
      : [{ op: '=', v: from }];
  if (op === '^') {
    const upper = M > 0 || m === null ? [M + 1, 0, 0] : [0, m + 1, 0];
    return [
      { op: '>=', v: from },
      { op: '<', v: upper },
    ];
  }
  if (op === '~')
    return [
      { op: '>=', v: from },
      { op: '<', v: m === null ? [M + 1, 0, 0] : [M, m + 1, 0] },
    ];
  if (op === '>=') return [{ op: '>=', v: from }];
  if (op === '<') return [{ op: '<', v: from }];
  if (op === '<=') return [next ? { op: '<', v: next } : { op: '<=', v: from }];
  return [next ? { op: '>=', v: next } : { op: '>', v: from }];
}

/**
 * Whether a release version satisfies an npm range (`||`, spaces, `^`, `~`, comparators and
 * x-ranges; hyphen ranges are not used in this fleet and throw).
 *
 * @param {string} version Release version such as `24.22.3`.
 * @param {string} range Range such as `^22.22.2 || >=24.15.0` or `>=22.12.0 <=26.x.x`.
 * @returns {boolean} True when the version is inside the range.
 * @throws {RangeError} For an invalid version or an unsupported range.
 */
export function satisfies(version, range) {
  const parsed = parseVersion(version);
  if (!parsed) throw new RangeError(`invalid version "${version}"`);
  const v = [parsed.major, parsed.minor, parsed.patch];
  const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  const test = ({ op, v: bound }) => {
    const c = cmp(v, bound);
    if (op === '>=') return c >= 0;
    if (op === '>') return c > 0;
    if (op === '<') return c < 0;
    if (op === '<=') return c <= 0;
    return c === 0;
  };
  return String(range ?? '*')
    .split('||')
    .some((set) => {
      const tokens = set
        .replace(/(<=|>=|<|>|=|\^|~)\s+/g, '$1')
        .trim()
        .split(/\s+/);
      if (tokens.includes('-')) throw new RangeError(`hyphen ranges are not supported: "${set}"`);
      return tokens.filter(Boolean).flatMap(tokenComparators).every(test);
    });
}

// ---------------------------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------------------------

/**
 * Picks the Strapi version to test from abbreviated npm metadata: `dist-tags.latest` when it is
 * a non-deprecated 5.x release, otherwise the highest non-deprecated 5.x release.
 *
 * @param {{'dist-tags'?: Record<string, string>, versions?: Record<string, {deprecated?: string}>}} meta
 *   Registry document (`Accept: application/vnd.npm.install-v1+json`).
 * @param {string} [forced] Exact version requested by a manual run.
 * @returns {{version: string, latestTag: string|null, newerMajor: string|null, forced: boolean}}
 *   The version, the `latest` tag and the `latest` tag when it is a newer major.
 * @throws {Error} When no 5.x release exists or a forced version is not published.
 */
export function selectStrapi(meta, forced) {
  const versions = meta.versions || {};
  const latestTag = meta['dist-tags']?.latest || null;
  const latest = parseVersion(latestTag);
  const newerMajor = latest && latest.major > STRAPI_MAJOR ? latestTag : null;
  if (forced) {
    if (!versions[forced]) throw new Error(`@strapi/strapi@${forced} is not published`);
    return { version: forced, latestTag, newerMajor, forced: true };
  }
  const usable = (v) => {
    const parsed = parseVersion(v);
    return parsed && !parsed.pre && parsed.major === STRAPI_MAJOR && !versions[v]?.deprecated;
  };
  let version = usable(latestTag) ? latestTag : null;
  if (!version) {
    const candidates = Object.keys(versions).filter(usable).sort(compareVersions);
    version = candidates.at(-1) || null;
  }
  if (!version) throw new Error(`no usable @strapi/strapi ${STRAPI_MAJOR}.x release found`);
  return { version, latestTag, newerMajor, forced: false };
}

/**
 * Picks the Node.js versions to test: the newest release, the newest LTS release, and the
 * newest patch of every LTS line that is in its LTS phase today and inside `engines.node`.
 * Prereleases (`27.0.0-alpha`) are ignored. The newest release and newest LTS are tested even
 * outside `engines.node` (marked `inEngines: false`) so a new line is seen early.
 *
 * @param {object} input Inputs.
 * @param {Array<{version: string, lts: string|false}>} input.index nodejs.org/dist/index.json.
 * @param {Record<string, {lts?: string, end?: string}>|null} input.schedule nodejs/Release
 *   schedule.json, or null when it could not be read (then every line with an LTS release counts).
 * @param {string} input.engines `engines.node` of the plugin (`*` when missing).
 * @param {string} input.today ISO date `YYYY-MM-DD`.
 * @param {string} [input.forced] Comma-separated versions or majors requested by a manual run.
 * @returns {Array<{version: string, major: number, lts: string|null, reasons: string[], inEngines: boolean}>}
 *   Versions sorted by major.
 * @throws {Error} When the index has no release or a forced version is unknown.
 */
export function selectNode({ index, schedule, engines, today, forced }) {
  const newest = new Map();
  for (const release of index) {
    const parsed = parseVersion(release.version);
    if (!parsed || parsed.pre) continue;
    const version = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
    const known = newest.get(parsed.major);
    if (!known || compareVersions(version, known.version) > 0) {
      newest.set(parsed.major, { version, major: parsed.major, lts: release.lts || null });
    }
  }
  if (!newest.size) throw new Error('nodejs.org index has no release');
  const range = engines || '*';
  const picked = new Map();
  const add = (entry, reason) => {
    const item = picked.get(entry.major) || { ...entry, reasons: [] };
    item.reasons.push(reason);
    item.inEngines = satisfies(item.version, range);
    picked.set(entry.major, item);
  };
  if (forced) {
    for (const want of forced
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)) {
      const exact = parseVersion(want);
      const line = newest.get(exact ? exact.major : Number(want));
      if (!line) throw new Error(`Node ${want} is not in the nodejs.org index`);
      if (exact && !index.some((r) => r.version === `v${want}`)) {
        throw new Error(`Node ${want} is not in the nodejs.org index`);
      }
      add(exact ? { ...line, version: want } : line, 'forced');
    }
    return [...picked.values()].sort((a, b) => a.major - b.major);
  }
  const all = [...newest.values()].sort((a, b) => b.major - a.major);
  add(all[0], 'newest release');
  const newestLts = all.find((entry) => entry.lts);
  if (newestLts) add(newestLts, 'newest LTS');
  for (const entry of all) {
    const line = schedule?.[`v${entry.major}`];
    const inLts = schedule
      ? Boolean(line?.lts && line.lts <= today && (!line.end || today < line.end))
      : Boolean(entry.lts);
    if (inLts && satisfies(entry.version, range)) add(entry, 'supported LTS');
  }
  return [...picked.values()].sort((a, b) => a.major - b.major);
}

/**
 * Lists the `@strapi/*` packages of a package.json that follow the Strapi core version (their
 * range is on major 5), pinned to `version`. `@strapi/strapi` is always included.
 *
 * @param {{dependencies?: object, devDependencies?: object, peerDependencies?: object}} pkg
 *   package.json content.
 * @param {string} version Strapi version.
 * @returns {string[]} For example `['@strapi/strapi@5.65.0', '@strapi/utils@5.65.0']`.
 */
export function strapiPackages(pkg, version) {
  const names = new Set(['@strapi/strapi']);
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const [name, range] of Object.entries(pkg[field] || {})) {
      if (!name.startsWith('@strapi/')) continue;
      const onMajor = new RegExp(`^\\s*[\\^~>=]*\\s*v?${STRAPI_MAJOR}(\\.|$)`);
      if (onMajor.test(String(range))) names.add(name);
    }
  }
  return [...names].sort().map((name) => `${name}@${version}`);
}

// ---------------------------------------------------------------------------------------------
// Version guards and the test-app pin
// ---------------------------------------------------------------------------------------------

/**
 * Shifts version mentions after a guard bump from minor `from` to minor `to`: `5.<from+1>` (the
 * "first untested" example) becomes `5.<to+1>`, then `5.<from>` becomes `5.<to>`.
 *
 * @param {string} text File content.
 * @param {number} major Major version.
 * @param {number} from Old highest tested minor.
 * @param {number} to New highest tested minor.
 * @returns {string} Updated content.
 */
export function shiftMinor(text, major, from, to) {
  const re = (minor) => new RegExp(`(?<![\\d.])${major}\\.${minor}(?!\\d)`, 'g');
  const hold = '\u0000compat-canary\u0000';
  return text
    .replace(re(from + 1), hold)
    .replace(re(from), `${major}.${to}`)
    .replaceAll(hold, `${major}.${to + 1}`);
}

/**
 * Raises the Strapi version guards described in `.github/compat-canary.json` to the minor of
 * `version`. A guard names a source `file`, a `pattern` whose first group is the highest tested
 * minor, and `shift` files whose version mentions follow it (messages, README, tests).
 *
 * @param {{guards?: Array<{name: string, file: string, pattern: string, major?: number, shift?: string[]}>}} config
 *   Parsed `.github/compat-canary.json` (an empty object when the file is missing).
 * @param {string} version Strapi version under test.
 * @param {{read: (file: string) => string, write?: (file: string, text: string) => void}} io
 *   File access; without `write` nothing is changed (dry run).
 * @returns {{raised: Array<{name: string, from: number, to: number}>, files: string[]}} What changed.
 * @throws {Error} When a guard pattern does not match its file.
 */
export function applyGuards(config, version, io) {
  const parsed = parseVersion(version);
  const raised = [];
  const files = new Set();
  for (const guard of config.guards || []) {
    const major = guard.major ?? STRAPI_MAJOR;
    const source = io.read(guard.file);
    const pattern = new RegExp(guard.pattern);
    const match = pattern.exec(source);
    if (!match) throw new Error(`guard "${guard.name}": pattern not found in ${guard.file}`);
    const from = Number(match[1]);
    if (!parsed || parsed.major !== major || parsed.minor <= from) continue;
    const to = parsed.minor;
    const replaced = match[0].replace(match[1], String(to));
    const updated = source.replace(pattern, () => replaced);
    const changes = [[guard.file, source, updated]];
    for (const file of guard.shift || []) {
      const text = io.read(file);
      changes.push([file, text, shiftMinor(text, major, from, to)]);
    }
    for (const [file, before, after] of changes) {
      if (before === after) continue;
      files.add(file);
      io.write?.(file, after);
    }
    raised.push({ name: guard.name, from, to });
  }
  return { raised, files: [...files] };
}

/**
 * Sets every exact `@strapi/*` pin that equals the current `@strapi/strapi` version to `version`.
 *
 * @param {{dependencies?: Record<string, string>, devDependencies?: Record<string, string>}} pkg
 *   package.json content of the host app (changed in place).
 * @param {string} version New Strapi version.
 * @returns {{from: string, changed: string[]}} Old version and changed package names.
 * @throws {Error} When `@strapi/strapi` is not pinned to an exact version.
 */
export function bumpAppPins(pkg, version) {
  const from = pkg.dependencies?.['@strapi/strapi'];
  if (!parseVersion(from)) throw new Error('@strapi/strapi is not pinned to an exact version');
  const changed = [];
  for (const field of ['dependencies', 'devDependencies']) {
    for (const [name, value] of Object.entries(pkg[field] || {})) {
      if (name.startsWith('@strapi/') && value === from && from !== version) {
        pkg[field][name] = version;
        changed.push(name);
      }
    }
  }
  return { from, changed };
}

// ---------------------------------------------------------------------------------------------
// Report: markers, job results, log excerpts
// ---------------------------------------------------------------------------------------------

/**
 * Renders a hidden marker comment with JSON data.
 *
 * @param {string} kind One of MARKERS.
 * @param {unknown} data JSON-serialisable data.
 * @returns {string} `<!-- kind {...} -->`.
 */
export function writeMarker(kind, data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<!-- ${kind} ${json} -->`;
}

/**
 * Reads the JSON of a marker from an issue body.
 *
 * @param {string|null|undefined} body Issue body.
 * @param {string} kind One of MARKERS.
 * @returns {any} The data, or null when the marker is missing or broken.
 */
export function readMarker(body, kind) {
  const escaped = kind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<!-- ${escaped} (\\{.*?\\}) -->`, 's').exec(body || '');
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Masks credentials that could appear in a log line. GitHub already masks registered secrets;
 * this catches tokens and URLs with passwords printed by tools.
 *
 * @param {string} text Log text.
 * @returns {string} Text with credentials replaced by `[redacted]`.
 */
export function redact(text) {
  const masked = TOKEN_PATTERNS.reduce((out, re) => out.replace(re, '[redacted]'), text);
  return masked
    .replace(/(authorization:\s*)(bearer|token|basic)\s+\S+/gi, '$1$2 [redacted]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s:/@]+:[^\s@/]+@/gi, '$1[redacted]@')
    .replace(
      /\b([A-Za-z_]*(?:password|passwd|secret|token|api[_-]?key|salt)[A-Za-z_]*\s*[=:]\s*)\S+/gi,
      '$1[redacted]'
    );
}

/**
 * Cuts the interesting part out of a job log: the lines before the first `##[error]` line and
 * the error itself, without timestamps, redacted and limited in size.
 *
 * @param {string} log Raw job log.
 * @returns {string} Excerpt.
 */
export function excerptLog(log) {
  const lines = String(log || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z ?/, ''));
  let end = lines.findIndex((line) => line.includes('##[error]'));
  end = end === -1 ? lines.length : end + 3;
  const picked = lines
    .slice(Math.max(0, end - EXCERPT_LINES), end)
    .map((line) => line.replace(/^##\[(?:group|endgroup)\]/, ''))
    .join('\n')
    .trim();
  let text = redact(picked).replace(/~~~/g, '~ ~ ~');
  if (text.length > EXCERPT_CHARS) text = `...\n${text.slice(text.length - EXCERPT_CHARS)}`;
  return text;
}

/**
 * Sorts the jobs of a run into failed, cancelled and passed. The report job itself and jobs that
 * have not finished are ignored.
 *
 * @param {Array<{id: number, name: string, status: string, conclusion: string|null, html_url?: string,
 *   steps?: Array<{name: string, conclusion: string|null}>}>} jobs Jobs from the Actions API.
 * @param {string} reportJob Name of the report job.
 * @returns {{failed: Array<{id: number, name: string, node: string|null, step: string|null, url: string|null}>,
 *   cancelled: boolean, total: number}} Classification.
 */
export function classifyJobs(jobs, reportJob) {
  const failed = [];
  let cancelled = false;
  let total = 0;
  for (const job of jobs) {
    if (job.name === reportJob || job.status !== 'completed') continue;
    total += 1;
    if (job.conclusion === 'cancelled') cancelled = true;
    if (job.conclusion !== 'failure' && job.conclusion !== 'timed_out') continue;
    const step = (job.steps || []).find((s) => s.conclusion === 'failure');
    const node = /Node (\d+\.\d+\.\d+)/.exec(job.name)?.[1] || null;
    failed.push({
      id: job.id,
      name: job.name,
      node,
      step: step?.name || null,
      url: job.html_url || null,
    });
  }
  return { failed, cancelled, total };
}

/**
 * Describes what is new compared to the last passing run.
 *
 * @param {{strapi: string, nodes: Array<{version: string}>}} current Versions of this run.
 * @param {{strapi?: string, nodes?: string[]}|null|undefined} lastPass Last passing run.
 * @returns {string[]} Human-readable differences (empty when nothing changed).
 */
export function whatsNew(current, lastPass) {
  if (!lastPass) return ['no passing run recorded yet'];
  const news = [];
  const { strapi } = current;
  if (lastPass.strapi !== strapi) news.push(`Strapi ${lastPass.strapi} -> ${strapi}`);
  const before = new Set(lastPass.nodes || []);
  for (const node of current.nodes) {
    if (!before.has(node.version)) news.push(`Node ${node.version}`);
  }
  return news;
}

/**
 * Formats the tested Node versions for an issue.
 *
 * @param {Array<{version: string, reasons: string[], inEngines: boolean}>} nodes Tested versions.
 * @returns {string} For example `22.23.5 (supported LTS), 26.13.1 (newest release)`.
 */
function formatNodes(nodes) {
  return nodes
    .map((n) => {
      const note = n.inEngines ? '' : ', outside engines.node';
      return `${n.version} (${n.reasons.join(', ')}${note})`;
    })
    .join(', ');
}

/**
 * Title of the failure issue.
 *
 * @param {{strapi: string|null, nodes: Array<{version: string}>}} current Versions of this run.
 * @param {Array<{node: string|null}>} failed Failed jobs.
 * @returns {string} For example `Compatibility: Strapi 5.65.0 / Node 26.13.1`.
 */
export function failureTitle(current, failed) {
  if (!current.strapi) return `${FAILURE_PREFIX}canary could not resolve the versions to test`;
  let nodes = [...new Set(failed.map((f) => f.node).filter(Boolean))];
  if (!nodes.length) nodes = current.nodes.map((n) => n.version);
  nodes.sort(compareVersions);
  return `${FAILURE_PREFIX}Strapi ${current.strapi} / Node ${nodes.join(', ')}`;
}

/**
 * Body of the failure issue.
 *
 * @param {object} input Inputs.
 * @param {{strapi: string|null, newerMajor?: string|null, nodes: Array<{version: string, reasons: string[],
 *   inEngines: boolean}>}} input.current Versions of this run.
 * @param {Array<{name: string, step: string|null, url: string|null, excerpt?: string}>} input.failed Failed jobs.
 * @param {{strapi: string, nodes: string[], date: string, run: string}|null} input.lastPass Last pass.
 * @param {string} input.runUrl URL of this run.
 * @param {string} input.fingerprint Failure fingerprint.
 * @returns {string} Markdown body.
 */
export function failureBody({ current, failed, lastPass, runUrl, fingerprint }) {
  const lastNodes = lastPass?.nodes?.join(', ') || '(not recorded)';
  const last = lastPass
    ? `Strapi ${lastPass.strapi} / Node ${lastNodes} on ${lastPass.date} ([run](${lastPass.run}))`
    : 'none recorded';
  const lines = [
    'The compatibility canary tested this plugin against newer Strapi and Node.js versions than the',
    'lockfile pins, and something broke.',
    '',
    '| | |',
    '| --- | --- |',
    `| Strapi | ${current.strapi || 'unknown'} |`,
    `| Node.js | ${current.nodes.length ? formatNodes(current.nodes) : 'unknown'} |`,
    `| Run | ${runUrl} |`,
    `| Last passing run | ${last} |`,
  ];
  if (current.newerMajor) lines.push(`| Newer Strapi major | ${current.newerMajor} (not tested) |`);
  lines.push('', '### Failing jobs', '');
  for (const job of failed) {
    const step = job.step ? `, step "${job.step}"` : '';
    lines.push(`- **${job.name}**${step}${job.url ? ` ([log](${job.url}))` : ''}`);
  }
  for (const job of failed.filter((j) => j.excerpt).slice(0, MAX_EXCERPTS)) {
    lines.push(
      '',
      `<details><summary>Log excerpt: ${job.name}</summary>`,
      '',
      '~~~text',
      job.excerpt,
      '~~~',
      '',
      '</details>'
    );
  }
  lines.push(
    '',
    '### Next steps',
    '',
    '1. Reproduce with the versions above: `npm ci`, then `npm install --no-save` the listed Strapi',
    '   packages, on the listed Node.js version (see `.github/workflows/canary.yml`).',
    '2. Fix it on a branch. The canary closes this issue by itself on its next green run',
    '   (weekly, or Actions -> Compatibility canary -> Run workflow).',
    '',
    writeMarker(MARKERS.failure, { fingerprint, strapi: current.strapi, run: runUrl })
  );
  return lines.join('\n');
}

/**
 * Body of the state issue.
 *
 * @param {{lastPass: object|null, lastRun: object}} state State to store.
 * @returns {string} Markdown body.
 */
export function stateBody(state) {
  const row = (label, entry) =>
    entry
      ? `| ${label} | ${entry.strapi || 'unknown'} | ${(entry.nodes || []).join(', ') || 'unknown'} | ${entry.date} | [run](${entry.run}) |`
      : `| ${label} | | | | |`;
  return [
    'This closed issue stores the state of the weekly compatibility canary',
    '(`.github/workflows/canary.yml`). The canary edits it; editing a closed issue sends no',
    'notification. Do not delete it, or the canary starts again from "no passing run recorded".',
    '',
    '| | Strapi | Node.js | Date | |',
    '| --- | --- | --- | --- | --- |',
    row('Last passing run', state.lastPass),
    row(`Last run (${state.lastRun?.outcome || 'unknown'})`, state.lastRun),
    '',
    writeMarker(MARKERS.state, state),
  ].join('\n');
}

/**
 * One line that says what an action does, for the job summary.
 *
 * @param {{type: string, number?: number|null, title?: string, comment?: string|null}} action Action.
 * @returns {string} For example `update #9 (with a comment): Compatibility: ...`.
 */
export function describeAction(action) {
  const issue = action.number ? `#${action.number}` : '';
  if (action.type === 'create') return `open a new issue: ${action.title}`;
  if (action.type === 'close') return `comment on and close ${issue}`;
  if (action.type === 'update') {
    const how = action.comment ? 'with one comment' : 'body only, no notification';
    return `update ${issue} (${how}): ${action.title}`;
  }
  return issue ? `update the state issue ${issue}` : 'create the closed state issue';
}

/**
 * Decides which issue changes a run causes. Pure: the caller performs the actions.
 *
 * @param {object} input Inputs.
 * @param {'pass'|'fail'} input.outcome Result of the run.
 * @param {{strapi: string|null, newerMajor?: string|null, nodes: Array<{version: string, reasons: string[],
 *   inEngines: boolean}>}} input.current Versions of this run.
 * @param {Array<object>} input.failed Failed jobs (see classifyJobs), with optional `excerpt`.
 * @param {{number: number, body: string}|null} input.stateIssue The state issue, if it exists.
 * @param {Array<{number: number, title: string, body: string}>} input.openFailures Open failure issues.
 * @param {string} input.runUrl URL of this run.
 * @param {string} input.date ISO date of this run.
 * @returns {{actions: Array<object>, state: object, news: string[]}} Planned actions and new state.
 */
export function planReport({ outcome, current, failed, stateIssue, openFailures, runUrl, date }) {
  const previous = readMarker(stateIssue?.body, MARKERS.state) || { lastPass: null, lastRun: null };
  const entry = {
    strapi: current.strapi,
    nodes: current.nodes.map((n) => n.version),
    date,
    run: runUrl,
    outcome,
  };
  const state = { lastPass: outcome === 'pass' ? entry : previous.lastPass, lastRun: entry };
  const news = current.strapi ? whatsNew(current, previous.lastPass) : [];
  const actions = [];
  if (outcome === 'pass') {
    for (const issue of openFailures) {
      const comment = `Passed on Strapi ${current.strapi} / Node ${entry.nodes.join(', ')} in ${runUrl}. Closing.`;
      actions.push({ type: 'close', number: issue.number, comment });
    }
  } else {
    const names = failed.map((f) => f.name).sort();
    const fingerprint = [current.strapi, ...names].join('|');
    const title = failureTitle(current, failed);
    const lastPass = previous.lastPass;
    const body = failureBody({ current, failed, lastPass, runUrl, fingerprint });
    const [existing, ...duplicates] = [...openFailures].sort((a, b) => a.number - b.number);
    if (!existing) {
      actions.push({ type: 'create', title, body });
    } else if (readMarker(existing.body, MARKERS.failure)?.fingerprint === fingerprint) {
      actions.push({ type: 'update', number: existing.number, title, body, comment: null });
    } else {
      const comment = `The failure changed in ${runUrl}: ${names.join(', ')}.`;
      actions.push({ type: 'update', number: existing.number, title, body, comment });
    }
    for (const issue of duplicates) {
      const comment = `Duplicate of #${existing.number}. Closing.`;
      actions.push({ type: 'close', number: issue.number, comment });
    }
  }
  const stateText = stateBody(state);
  if (stateIssue) actions.push({ type: 'state', number: stateIssue.number, body: stateText });
  else actions.push({ type: 'state', number: null, body: stateText });
  return { actions, state, news };
}

/**
 * Title and body of a pull request that raises version guards or the test-app pin.
 *
 * @param {object} input Inputs.
 * @param {'guards'|'app-pin'} input.kind What the pull request changes.
 * @param {{strapi: string, nodes: Array<{version: string, reasons: string[], inEngines: boolean}>}} input.current
 *   Versions of this run.
 * @param {Array<{name: string, from: number, to: number}>} input.raised Raised guards (kind guards).
 * @param {string[]} input.files Changed files.
 * @param {string} input.runUrl URL of the passing run.
 * @returns {{title: string, body: string, commit: string}} Pull request text and commit message.
 */
export function proposalText({ kind, current, raised, files, runUrl }) {
  const v = parseVersion(current.strapi);
  const minor = `${v.major}.${v.minor}`;
  const minorOf = (value) => `${v.major}.${value}`;
  const title =
    kind === 'guards'
      ? `fix(compat): enable ${raised.map((g) => g.name).join(', ')} on Strapi ${minor}`
      : `chore(deps): run the test app on Strapi ${current.strapi}`;
  const what =
    kind === 'guards'
      ? raised.map((g) => `- ${g.name}: tested up to ${minorOf(g.from)} -> ${minorOf(g.to)}`)
      : [`- test-app: \`@strapi/*\` pins -> ${current.strapi} (package.json, package-lock.json)`];
  const body = [
    `The compatibility canary passed on Strapi ${current.strapi} and proposes this change.`,
    '',
    ...what,
    '',
    '### Evidence',
    '',
    `- Passing run: ${runUrl}`,
    `- Strapi: ${current.strapi}`,
    `- Node.js: ${formatNodes(current.nodes)}`,
    '',
    '### Files',
    '',
    ...files.map((f) => `- \`${f}\``),
    '',
    '### Before merging',
    '',
    '- [ ] Read the Strapi release notes for this version.',
    '- [ ] Check the wording of the changed messages and docs (the canary only shifts version numbers).',
    '- [ ] Close and reopen this pull request once: pull requests opened with the workflow token',
    '      do not start the other workflows, so CI has not run yet.',
    '',
    'The canary never merges this pull request.',
    '',
    writeMarker(MARKERS.proposal, { kind, strapi: current.strapi, run: runUrl }),
  ].join('\n');
  const commit = `${title}\n\nCompatibility canary run: ${runUrl}`;
  return { title, body, commit };
}

// ---------------------------------------------------------------------------------------------
// I/O helpers (not unit-tested: network, files, environment)
// ---------------------------------------------------------------------------------------------

/**
 * Fetches JSON with a timeout.
 *
 * @param {string} url URL.
 * @param {Record<string, string>} [headers] Request headers.
 * @returns {Promise<any>} Parsed body.
 * @throws {Error} On a non-2xx answer or a timeout.
 */
async function getJson(url, headers = {}) {
  const res = await globalThis.fetch(url, {
    headers,
    signal: globalThis.AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GET ${url}: HTTP ${res.status}`);
  return res.json();
}

/**
 * Appends `name=value` outputs for later steps (multi-line safe).
 *
 * @param {Record<string, string>} values Outputs.
 * @returns {void}
 * @sideeffect Appends to the file named by GITHUB_OUTPUT, or prints when it is not set.
 */
function setOutputs(values) {
  for (const [name, value] of Object.entries(values)) {
    const delimiter = `EOF_${Math.random().toString(36).slice(2)}`;
    const text = `${name}<<${delimiter}\n${value}\n${delimiter}\n`;
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, text);
    else console.log(`${name}=${value}`);
  }
}

/**
 * Adds Markdown to the job summary.
 *
 * @param {string} markdown Text.
 * @returns {void}
 * @sideeffect Appends to GITHUB_STEP_SUMMARY when set.
 */
function summary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) appendFileSync(file, `${markdown}\n`);
}

/**
 * Small GitHub REST client on the workflow token.
 *
 * @param {string} token GITHUB_TOKEN.
 * @returns {(method: string, route: string, body?: unknown) => Promise<any>} Request function; it
 *   returns `null` for 404 and throws an Error with `status` for other failures.
 */
function githubClient(token) {
  const api = process.env.GITHUB_API_URL || 'https://api.github.com';
  return async (method, route, body) => {
    const res = await globalThis.fetch(`${api}${route}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'compat-canary',
        'x-github-api-version': '2022-11-28',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: globalThis.AbortSignal.timeout(30_000),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const error = new Error(`${method} ${route}: HTTP ${res.status} ${await res.text()}`);
      error.status = res.status;
      throw error;
    }
    const type = res.headers.get('content-type') || '';
    return type.includes('json') ? res.json() : res.text();
  };
}

/**
 * Reads a JSON environment variable.
 *
 * @param {string} name Variable name.
 * @param {any} fallback Value when unset or empty.
 * @returns {any} Parsed value.
 * @throws {SyntaxError} When the variable is not JSON.
 */
function envJson(name, fallback) {
  const raw = process.env[name];
  return raw ? JSON.parse(raw) : fallback;
}

/**
 * Reads `.github/compat-canary.json` (guards); an empty config when the file is missing.
 *
 * @returns {object} Config.
 */
function readConfig() {
  const file = '.github/compat-canary.json';
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

/** Text file access for applyGuards. */
const fileIo = {
  read: (file) => readFileSync(file, 'utf8'),
  write: (file, text) => writeFileSync(file, text),
};

// ---------------------------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------------------------

/**
 * `detect`: resolves the versions to test and writes them as step outputs.
 *
 * @returns {Promise<void>}
 * @sideeffect Network reads (npm registry, nodejs.org, GitHub raw), step outputs and summary.
 * @throws {Error} When the registry or the Node index cannot be read.
 */
async function detect() {
  const pkgFile = process.env.CANARY_PACKAGE || 'package.json';
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
  const meta = await getJson(`${NPM_REGISTRY}@strapi%2fstrapi`, {
    accept: 'application/vnd.npm.install-v1+json',
  });
  const strapi = selectStrapi(meta, process.env.CANARY_FORCE_STRAPI || undefined);
  const index = await getJson(NODE_INDEX_URL);
  let schedule = null;
  try {
    schedule = await getJson(NODE_SCHEDULE_URL);
  } catch (error) {
    console.warn(`Node release schedule unavailable (${error.message}); using the LTS flags only.`);
  }
  const today = new Date().toISOString().slice(0, 10);
  const engines = pkg.engines?.node || '*';
  const forced = process.env.CANARY_FORCE_NODE || undefined;
  const selected = selectNode({ index, schedule, engines, today, forced });
  const packages = strapiPackages(pkg, strapi.version);
  const newer = (a, b) => (compareVersions(a.version, b.version) >= 0 ? a : b);
  const newestNode = selected.reduce(newer);
  // The fleet canary boots the whole fleet once, on the newest release only.
  const nodes = process.env.CANARY_NEWEST_NODE_ONLY === 'true' ? [newestNode] : selected;
  const current = { strapi: strapi.version, newerMajor: strapi.newerMajor, nodes };
  setOutputs({
    strapi: strapi.version,
    packages: packages.join(' '),
    nodes: JSON.stringify(nodes.map((n) => n.version)),
    'newest-node': newestNode.version,
    current: JSON.stringify(current),
  });
  summary(
    [
      '### Compatibility canary: versions under test',
      '',
      `- Strapi: ${strapi.version}${strapi.forced ? ' (forced)' : ''} (npm latest: ${strapi.latestTag})`,
      `- Node.js: ${formatNodes(nodes)} (engines.node: \`${engines}\`)`,
      `- Packages: \`${packages.join(' ')}\``,
      strapi.newerMajor ? `- Newer Strapi major on npm: ${strapi.newerMajor} (not tested)` : '',
    ].join('\n')
  );
  console.log(JSON.stringify(current, null, 2));
}

/**
 * `assert <version> [dir]`: fails unless the Strapi core packages under `dir` have `version`.
 *
 * @param {string} version Expected version.
 * @param {string} [dir] Project directory (default: current directory).
 * @returns {void}
 * @sideeffect Sets process.exitCode on a mismatch.
 */
function assertInstalled(version, dir = '.') {
  for (const name of ['@strapi/strapi', '@strapi/core']) {
    const file = path.join(dir, 'node_modules', name, 'package.json');
    const installed = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).version : 'missing';
    console.log(`${name} ${installed}`);
    if (installed !== version) {
      console.error(`${name} is ${installed}, expected ${version}`);
      process.exitCode = 1;
    }
  }
}

/**
 * Runs git with arguments and returns its output.
 *
 * @param {string[]} args Arguments.
 * @returns {string} Trimmed stdout.
 * @sideeffect Runs git in the current directory.
 */
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

/**
 * Pushes a branch with the proposed change and opens a pull request; when the repository does
 * not allow Actions to open pull requests, opens a `compat` issue with the compare link instead.
 *
 * @param {object} input Inputs.
 * @param {Function} input.request GitHub client.
 * @param {string} input.repo `owner/name`.
 * @param {string} input.branch Branch to create.
 * @param {string[]} input.files Changed files to commit.
 * @param {{title: string, body: string, commit: string}} input.text Pull request text.
 * @returns {Promise<string>} What happened.
 * @sideeffect Creates a branch, a commit, a pull request or an issue.
 */
async function propose({ request, repo, branch, files, text }) {
  const info = await request('GET', `/repos/${repo}`);
  git(['config', 'user.name', 'github-actions[bot]']);
  git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  git(['switch', '--create', branch]);
  git(['add', '--', ...files]);
  git(['commit', '--message', text.commit]);
  git(['push', 'origin', `HEAD:refs/heads/${branch}`]);
  try {
    const pr = await request('POST', `/repos/${repo}/pulls`, {
      title: text.title,
      head: branch,
      base: info.default_branch,
      body: text.body,
      maintainer_can_modify: true,
    });
    await request('POST', `/repos/${repo}/issues/${pr.number}/labels`, { labels: [LABEL] });
    return `opened pull request ${pr.html_url}`;
  } catch (error) {
    if (error.status !== 403 && error.status !== 422) throw error;
    const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
    const compare = `${server}/${repo}/compare/${info.default_branch}...${branch}?expand=1`;
    const body = [
      'The workflow token may not open pull requests in this repository (Settings -> Actions ->',
      '"Allow GitHub Actions to create and approve pull requests" is off), so the canary pushed the',
      `branch \`${branch}\` instead. Open the pull request here: ${compare}`,
      '',
      text.body,
    ].join('\n');
    const issue = await request('POST', `/repos/${repo}/issues`, {
      title: `${FAILURE_PREFIX}ready: ${text.title}`,
      body,
      labels: [LABEL],
    });
    return `could not open a pull request (HTTP ${error.status}); opened issue ${issue.html_url}`;
  }
}

/**
 * `report`: classifies the jobs of this run, plans the issue changes and performs them (or prints
 * them on a dry run), then proposes a guard or pin update when the run passed.
 *
 * @returns {Promise<void>}
 * @sideeffect GitHub API reads and writes (issues, pull requests), git commits and pushes,
 *   job summary.
 * @throws {Error} When a GitHub request fails.
 */
async function report() {
  const env = process.env;
  const repo = env.GITHUB_REPOSITORY;
  const dryRun = env.CANARY_DRY_RUN === 'true';
  const runUrl = `${env.GITHUB_SERVER_URL || 'https://github.com'}/${repo}/actions/runs/${env.GITHUB_RUN_ID}`;
  const request = githubClient(env.GITHUB_TOKEN);
  const current = envJson('CANARY_CURRENT', { strapi: null, newerMajor: null, nodes: [] });
  const jobs = [];
  for (let page = 1; ; page += 1) {
    const route = `/repos/${repo}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT || 1}/jobs`;
    const data = await request('GET', `${route}?per_page=100&page=${page}`);
    jobs.push(...(data?.jobs || []));
    if (!data || data.jobs.length < 100) break;
  }
  const { failed, cancelled, total } = classifyJobs(jobs, env.CANARY_REPORT_JOB || 'Report');
  if (cancelled || total === 0) {
    console.log('The run was cancelled or has no finished job; nothing to report.');
    return;
  }
  for (const job of failed.slice(0, MAX_EXCERPTS)) {
    try {
      job.excerpt = excerptLog(await request('GET', `/repos/${repo}/actions/jobs/${job.id}/logs`));
    } catch (error) {
      job.excerpt = `(log not available: ${error.message.split('\n')[0]})`;
    }
  }
  const issues = [];
  for (let page = 1; ; page += 1) {
    const query = `labels=${LABEL}&state=all&per_page=100&page=${page}`;
    const data = (await request('GET', `/repos/${repo}/issues?${query}`)) || [];
    issues.push(...data.filter((issue) => !issue.pull_request));
    if (data.length < 100) break;
  }
  let stateIssue = issues.find((i) => readMarker(i.body, MARKERS.state)) || null;
  if (dryRun && env.CANARY_SIMULATE_LAST_PASS) {
    // Dry runs can pretend an older passing run to show the "new version" path.
    const run = 'simulated';
    const lastPass = {
      strapi: env.CANARY_SIMULATE_LAST_PASS,
      nodes: [],
      date: run,
      run,
      outcome: 'pass',
    };
    const simulated = { lastPass, lastRun: lastPass };
    stateIssue = { number: stateIssue?.number ?? 0, body: writeMarker(MARKERS.state, simulated) };
  }
  const isFailure = (i) => i.state === 'open' && readMarker(i.body, MARKERS.failure);
  const openFailures = issues.filter(isFailure);
  const outcome = failed.length ? 'fail' : 'pass';
  const date = new Date().toISOString().slice(0, 10);
  const plan = planReport({ outcome, current, failed, stateIssue, openFailures, runUrl, date });

  const log = [`### Compatibility canary: ${outcome === 'pass' ? 'passed' : 'failed'}`, ''];
  log.push(`- New since the last passing run: ${plan.news.join('; ') || 'nothing'}`);
  for (const action of plan.actions) {
    const target = action.number ? `#${action.number}` : 'new issue';
    log.push(`- ${dryRun ? 'Would: ' : ''}${describeAction(action)}`);
    if (dryRun && action.type !== 'state')
      console.log(`\n----- ${action.type} ${target}\n${action.body || action.comment}`);
    if (dryRun) continue;
    if (action.type === 'create') {
      await request('POST', `/repos/${repo}/issues`, {
        title: action.title,
        body: action.body,
        labels: [LABEL],
      });
    } else if (action.type === 'update') {
      await request('PATCH', `/repos/${repo}/issues/${action.number}`, {
        title: action.title,
        body: action.body,
      });
      if (action.comment)
        await request('POST', `/repos/${repo}/issues/${action.number}/comments`, {
          body: action.comment,
        });
    } else if (action.type === 'close') {
      await request('POST', `/repos/${repo}/issues/${action.number}/comments`, {
        body: action.comment,
      });
      await request('PATCH', `/repos/${repo}/issues/${action.number}`, {
        state: 'closed',
        state_reason: 'completed',
      });
    } else if (action.number) {
      await request('PATCH', `/repos/${repo}/issues/${action.number}`, { body: action.body });
    } else {
      const created = await request('POST', `/repos/${repo}/issues`, {
        title: STATE_TITLE,
        body: action.body,
        labels: [LABEL],
      });
      await request('PATCH', `/repos/${repo}/issues/${created.number}`, {
        state: 'closed',
        state_reason: 'completed',
      });
    }
  }

  const kind = env.CANARY_PROPOSE;
  if (outcome === 'pass' && (kind === 'guards' || kind === 'app-pin')) {
    let raised = [];
    let files;
    if (kind === 'guards') {
      const io = dryRun ? { read: fileIo.read } : fileIo;
      ({ raised, files } = applyGuards(readConfig(), current.strapi, io));
    } else {
      files = git(['status', '--porcelain', '--', ...(env.CANARY_PROPOSE_PATHS || '').split(' ')])
        .split('\n')
        .filter(Boolean)
        .map((line) => line.slice(3));
    }
    if (!files.length) {
      log.push('- Nothing to propose: the guards and pins already cover this version.');
    } else {
      const branch = `compat-canary/strapi-${current.strapi}`;
      const text = proposalText({ kind, current, raised, files, runUrl });
      const exists = await request('GET', `/repos/${repo}/branches/${encodeURIComponent(branch)}`);
      if (exists) {
        log.push(`- Already proposed on branch \`${branch}\`.`);
      } else if (dryRun) {
        log.push(`- Would push \`${branch}\` and open "${text.title}" (${files.join(', ')}).`);
        console.log(`\n----- proposal ${branch}\n${text.body}`);
      } else {
        log.push(`- Proposal: ${await propose({ request, repo, branch, files, text })}`);
      }
    }
  }
  summary(log.join('\n'));
  console.log(log.join('\n'));
}

/**
 * Command line entry point.
 *
 * @param {string[]} argv Arguments after the script name.
 * @returns {Promise<void>}
 * @sideeffect See the subcommands; sets process.exitCode on errors.
 */
async function main(argv) {
  const [command, ...args] = argv;
  if (command === 'detect') return detect();
  if (command === 'packages') {
    const pkg = JSON.parse(readFileSync(process.env.CANARY_PACKAGE || 'package.json', 'utf8'));
    console.log(strapiPackages(pkg, args[0]).join(' '));
    return undefined;
  }
  if (command === 'assert') return assertInstalled(args[0], args[1]);
  if (command === 'guards') {
    const result = applyGuards(readConfig(), args[0], fileIo);
    console.log(JSON.stringify(result));
    return undefined;
  }
  if (command === 'bump-app') {
    const file = path.join(args[0], 'package.json');
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    const result = bumpAppPins(pkg, args[1]);
    writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(JSON.stringify(result));
    return undefined;
  }
  if (command === 'report') return report();
  const known = 'detect, packages, assert, guards, bump-app, report';
  throw new Error(`unknown command "${command}" (${known})`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
const invokedDirectly = import.meta.url === entry;
if (invokedDirectly) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.stack || String(error));
    process.exitCode = 1;
  });
}
