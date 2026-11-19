#!/usr/bin/env node
/**
 * Dependency gate for Dependabot pull requests (version 2).
 *
 * One dependency-free script, byte-identical in every plugin repository. The workflow
 * `.github/workflows/dependency-auto-merge.yml` calls it; the unit tests in
 * `dependency-gate.test.mjs` cover every hold reason and the pass path.
 *
 * Subcommands:
 * - `policy`   prints the license policy for actions/dependency-review-action.
 * - `surface`  records the published surface of a built checkout (untrusted job, read-only).
 * - `decide`   compares base and head and decides `merge`, `major` or `hold` (trusted job).
 * - `route`    combines the gate decision with the Dependabot metadata and job results.
 * - `wait-ci`  waits until every other check on the head commit has finished green.
 *
 * The script never runs code from the pull request: `decide`, `route` and `wait-ci` read
 * lockfiles, package.json files and JSON reports as data. Only `surface` loads built entry
 * files, and the workflow runs it in a separate job without write permissions.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

/** Licenses allowed for every dependency (SPDX identifiers). */
export const ALLOWED_LICENSES = [
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-2-Clause-Views',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  'Unlicense',
  'Zlib',
];

/** Licenses allowed only for development dependencies (never shipped to a host). */
export const DEV_ONLY_LICENSES = ['MPL-2.0', 'CC-BY-3.0', 'CC-BY-4.0'];

/**
 * Packages whose license metadata does not match the allowlist but that are accepted after
 * review. Exact names only, matching the `allow-dependencies-licenses` purl semantics of
 * actions/dependency-review-action. `@strapi/*` packages are matched by scope in this script
 * because Strapi publishes them with `SEE LICENSE IN LICENSE` (MIT core plus an EE folder).
 */
export const LICENSE_EXCEPTIONS = [
  '@img/sharp-libvips-darwin-arm64',
  '@img/sharp-libvips-darwin-x64',
  '@img/sharp-libvips-linux-arm',
  '@img/sharp-libvips-linux-arm64',
  '@img/sharp-libvips-linux-ppc64',
  '@img/sharp-libvips-linux-riscv64',
  '@img/sharp-libvips-linux-s390x',
  '@img/sharp-libvips-linux-x64',
  '@img/sharp-libvips-linuxmusl-arm64',
  '@img/sharp-libvips-linuxmusl-x64',
  '@img/sharp-wasm32',
  '@img/sharp-win32-arm64',
  '@img/sharp-win32-ia32',
  '@img/sharp-win32-x64',
  'json-schema',
  'normalize-package-data',
  'npm',
];

/** Package scopes accepted regardless of license metadata (see LICENSE_EXCEPTIONS). */
export const LICENSE_EXCEPTION_SCOPES = ['@strapi/'];

/** Hold when one update adds more brand-new package names than this. */
export const MAX_NEW_PACKAGES = 15;

/** The only registry the lockfile may resolve packages from. */
export const REGISTRY_PREFIX = 'https://registry.npmjs.org/';

const SEVERITY_RANK = { low: 1, moderate: 2, high: 3, critical: 4 };
const MAX_JSON_BYTES = 64 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Minimal semver (npm range grammar subset: x-ranges, ~, ^, hyphen, comparators, ||)
// ---------------------------------------------------------------------------

const VERSION_RE =
  /^v?(\d{1,9})\.(\d{1,9})\.(\d{1,9})(?:-([0-9A-Za-z.-]{1,128}))?(?:\+[0-9A-Za-z.-]{1,128})?$/;
const PART = '(\\d{1,9}|[xX*])';
const TOKEN_RE = new RegExp(
  `^(<=|>=|<|>|=|\\^|~>?)?v?${PART}(?:\\.${PART})?(?:\\.${PART})?` +
    '(?:-([0-9A-Za-z.-]{1,128}))?(?:\\+[0-9A-Za-z.-]{1,128})?$'
);

/**
 * Parses an exact semver version.
 *
 * @param {string} input Version such as `1.2.3` or `1.2.3-beta.1`.
 * @returns {{major: number, minor: number, patch: number, pre: string[]} | null} Parsed version,
 *   or null when the input is not an exact version.
 */
export function parseVersion(input) {
  if (typeof input !== 'string' || input.length > 300) return null;
  const match = VERSION_RE.exec(input.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ? match[4].split('.') : [],
  };
}

/**
 * Compares two parsed versions with semver precedence (prerelease lower than release).
 *
 * @param {{major: number, minor: number, patch: number, pre: string[]}} a First version.
 * @param {{major: number, minor: number, patch: number, pre: string[]}} b Second version.
 * @returns {number} Negative, zero or positive.
 */
export function compareVersions(a, b) {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  if (!a.pre.length || !b.pre.length) return b.pre.length - a.pre.length;
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i += 1) {
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    if (a.pre[i] === b.pre[i]) continue;
    const an = /^\d+$/.test(a.pre[i]);
    const bn = /^\d+$/.test(b.pre[i]);
    if (an && bn) return Number(a.pre[i]) - Number(b.pre[i]);
    if (an) return -1;
    if (bn) return 1;
    return a.pre[i] < b.pre[i] ? -1 : 1;
  }
  return 0;
}

const v = (major, minor, patch, pre = []) => ({ major, minor, patch, pre });
const isWild = (part) => part === undefined || part === 'x' || part === 'X' || part === '*';

/**
 * Expands one range token (for example `^1.2`, `>=22`, `<=26.x.x`) into comparators.
 *
 * @param {string} token Token without spaces.
 * @returns {{op: string, ver: object, bound?: boolean}[] | null} Comparators; an empty array
 *   matches everything, null matches nothing.
 * @throws {RangeError} When the token is not valid range syntax.
 */
function expandToken(token) {
  const match = TOKEN_RE.exec(token);
  if (!match) throw new RangeError(`unsupported range token "${token}"`);
  let op = match[1] || '';
  if (op === '~>') op = '~';
  const [maj, min, pat] = [match[2], match[3], match[4]];
  const pre = match[5] ? match[5].split('.') : [];
  const M = isWild(maj) ? null : Number(maj);
  const m = isWild(min) ? null : Number(min);
  const p = isWild(pat) ? null : Number(pat);
  const lo = (a, b, c) => ({ op: '>=', ver: v(a, b, c, pre) });
  const hi = (a, b, c) => ({ op: '<', ver: v(a, b, c, ['0']), bound: true });

  if (op === '' || op === '=') {
    if (M === null) return [];
    if (m === null) return [lo(M, 0, 0), hi(M + 1, 0, 0)];
    if (p === null) return [lo(M, m, 0), hi(M, m + 1, 0)];
    return [{ op: '=', ver: v(M, m, p, pre) }];
  }
  if (op === '~') {
    if (M === null) return [];
    if (m === null) return [lo(M, 0, 0), hi(M + 1, 0, 0)];
    return [lo(M, m, p ?? 0), hi(M, m + 1, 0)];
  }
  if (op === '^') {
    if (M === null) return [];
    if (m === null) return [lo(M, 0, 0), hi(M + 1, 0, 0)];
    if (M > 0) return [lo(M, m, p ?? 0), hi(M + 1, 0, 0)];
    if (p === null || m > 0) return [lo(0, m, p ?? 0), hi(0, m + 1, 0)];
    return [lo(0, 0, p), hi(0, 0, p + 1)];
  }
  if (M === null) return op === '<' || op === '>' ? null : [];
  if (op === '>') {
    if (m === null) return [lo(M + 1, 0, 0)];
    if (p === null) return [lo(M, m + 1, 0)];
    return [{ op: '>', ver: v(M, m, p, pre) }];
  }
  if (op === '>=') return [lo(M, m ?? 0, p ?? 0)];
  if (op === '<') {
    if (m === null) return [hi(M, 0, 0)];
    if (p === null) return [hi(M, m, 0)];
    return [{ op: '<', ver: v(M, m, p, pre) }];
  }
  // op === '<='
  if (m === null) return [hi(M + 1, 0, 0)];
  if (p === null) return [hi(M, m + 1, 0)];
  return [{ op: '<=', ver: v(M, m, p, pre) }];
}

/**
 * Parses an npm version range into comparator sets (OR of ANDs).
 *
 * @param {string} range Range such as `^22.22.2 || >=24.15.0` or `>=22.0.0 <=26.x.x`.
 * @returns {Array<Array<{op: string, ver: object, bound?: boolean}>>} Comparator sets.
 * @throws {RangeError} When the range is not supported syntax or longer than 512 characters.
 */
export function parseRange(range) {
  if (typeof range !== 'string' || range.length > 512) {
    throw new RangeError('range must be a string of at most 512 characters');
  }
  const sets = [];
  for (const raw of range.split('||')) {
    let part = raw.trim();
    const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(part);
    if (hyphen) {
      const upper = expandToken(hyphen[2]);
      const isPartial = upper && upper.length === 2;
      part = `>=${hyphen[1]} ${isPartial ? `<${fmt(upper[1].ver)}` : `<=${hyphen[2]}`}`;
    }
    part = part.replace(/(<=|>=|<|>|=|\^|~>?)\s+/g, '$1');
    const tokens = part === '' ? [] : part.split(/\s+/);
    let set = [];
    let empty = false;
    for (const token of tokens) {
      const expanded = expandToken(token);
      if (expanded === null) empty = true;
      else set = set.concat(expanded);
    }
    if (!empty) sets.push(set);
  }
  return sets;
}

/**
 * Formats a parsed version back into a string.
 *
 * @param {{major: number, minor: number, patch: number, pre: string[]}} ver Parsed version.
 * @returns {string} Version string.
 */
function fmt(ver) {
  const base = `${ver.major}.${ver.minor}.${ver.patch}`;
  return ver.pre.length ? `${base}-${ver.pre.join('.')}` : base;
}

/**
 * Tests one comparator.
 *
 * @param {object} ver Parsed version.
 * @param {{op: string, ver: object}} comp Comparator.
 * @returns {boolean} True when the version satisfies the comparator.
 */
function testComparator(ver, comp) {
  const c = compareVersions(ver, comp.ver);
  switch (comp.op) {
    case '=':
      return c === 0;
    case '>':
      return c > 0;
    case '>=':
      return c >= 0;
    case '<':
      return c < 0;
    default:
      return c <= 0;
  }
}

/**
 * Checks whether a version satisfies a range, with npm's prerelease rule: a prerelease only
 * matches when a comparator in the same set names the same major.minor.patch with a prerelease.
 *
 * @param {string} version Exact version.
 * @param {string} range npm range.
 * @returns {boolean} True when satisfied.
 * @throws {RangeError} When the version or range cannot be parsed.
 */
export function satisfies(version, range) {
  const ver = parseVersion(version);
  if (!ver) throw new RangeError(`invalid version "${version}"`);
  return parseRange(range).some((set) => {
    if (!set.every((comp) => testComparator(ver, comp))) return false;
    if (!ver.pre.length) return true;
    return set.some(
      (comp) =>
        !comp.bound &&
        comp.ver.pre.length > 0 &&
        comp.ver.major === ver.major &&
        comp.ver.minor === ver.minor &&
        comp.ver.patch === ver.patch
    );
  });
}

/**
 * Returns the lowest release version that satisfies a range.
 *
 * @param {string} range npm range.
 * @returns {string | null} Lowest version, or null when nothing satisfies the range.
 * @throws {RangeError} When the range cannot be parsed.
 */
export function minVersion(range) {
  let best = null;
  for (const set of parseRange(range)) {
    let low = v(0, 0, 0);
    for (const comp of set) {
      let candidate = null;
      if (comp.op === '>=' || comp.op === '=') candidate = { ...comp.ver, pre: [] };
      if (comp.op === '>') candidate = v(comp.ver.major, comp.ver.minor, comp.ver.patch + 1);
      if (candidate && compareVersions(candidate, low) > 0) low = candidate;
    }
    if (!set.every((comp) => testComparator(low, comp))) continue;
    if (!best || compareVersions(low, best) < 0) best = low;
  }
  return best ? fmt(best) : null;
}

/**
 * Builds sample Node versions that a plugin's `engines.node` range supports: every major from
 * the lowest bound to the highest bound (two majors past the highest named one when the range
 * is open), at x.0.0, at each named bound and at a late minor of each major.
 *
 * @param {string} range The plugin's `engines.node`.
 * @returns {string[]} Sorted sample versions that satisfy the range.
 * @throws {RangeError} When the range cannot be parsed.
 */
export function nodeSamples(range) {
  const sets = parseRange(range);
  const named = [];
  let open = false;
  for (const set of sets) {
    if (!set.some((comp) => comp.op === '<' || comp.op === '<=' || comp.op === '=')) open = true;
    for (const comp of set) named.push(comp.ver);
  }
  if (!named.length) return [];
  const majors = named.map((ver) => ver.major);
  const lowest = Math.min(...majors);
  const highest = Math.max(...majors) + (open ? 2 : 0);
  const candidates = new Set();
  for (let major = lowest; major <= highest; major += 1) {
    candidates.add(`${major}.0.0`);
    candidates.add(`${major}.99.0`);
  }
  for (const ver of named) {
    candidates.add(fmt({ ...ver, pre: [] }));
    candidates.add(`${ver.major}.${ver.minor}.${ver.patch + 1}`);
  }
  return [...candidates]
    .filter((sample) => satisfies(sample, range))
    .sort((a, b) => compareVersions(parseVersion(a), parseVersion(b)));
}

// ---------------------------------------------------------------------------
// SPDX license expressions
// ---------------------------------------------------------------------------

/**
 * Evaluates an SPDX license expression against an allowlist. `OR` needs one allowed side,
 * `AND` needs both, `WITH` exceptions are ignored, `+` is accepted as the same license.
 *
 * @param {string} expression SPDX expression, for example `(MIT OR Apache-2.0)`.
 * @param {string[]} allowed Allowed SPDX identifiers.
 * @returns {boolean} True when the expression is satisfied by the allowlist.
 * @throws {SyntaxError} When the expression cannot be parsed.
 */
export function licenseAllowed(expression, allowed) {
  if (typeof expression !== 'string' || expression.length > 512) {
    throw new SyntaxError('license must be a string of at most 512 characters');
  }
  const tokens = expression.match(/\(|\)|[^\s()]+/g) || [];
  const allow = new Set(allowed.map((id) => id.toLowerCase()));
  let pos = 0;
  const peek = () => tokens[pos];
  const parsePrimary = () => {
    const token = tokens[pos++];
    if (token === undefined) throw new SyntaxError('unexpected end of license expression');
    if (token === '(') {
      const value = parseOr();
      if (tokens[pos++] !== ')') throw new SyntaxError('missing ) in license expression');
      return value;
    }
    if (/^(AND|OR|WITH|\))$/i.test(token)) throw new SyntaxError(`unexpected "${token}"`);
    let value = allow.has(token.replace(/\+$/, '').toLowerCase());
    if (peek() && /^WITH$/i.test(peek())) {
      pos += 2;
      value = value && tokens[pos - 1] !== undefined;
    }
    return value;
  };
  const parseAnd = () => {
    let value = parsePrimary();
    while (peek() && /^AND$/i.test(peek())) {
      pos += 1;
      value = parsePrimary() && value;
    }
    return value;
  };
  const parseOr = () => {
    let value = parseAnd();
    while (peek() && /^OR$/i.test(peek())) {
      pos += 1;
      value = parseAnd() || value;
    }
    return value;
  };
  const result = parseOr();
  if (pos !== tokens.length) throw new SyntaxError('trailing tokens in license expression');
  return result;
}

/**
 * Tells whether a package is exempt from the license allowlist.
 *
 * @param {string} name npm package name.
 * @returns {boolean} True for the reviewed exceptions.
 */
export function licenseException(name) {
  return (
    LICENSE_EXCEPTIONS.includes(name) ||
    LICENSE_EXCEPTION_SCOPES.some((scope) => name.startsWith(scope))
  );
}

// ---------------------------------------------------------------------------
// Lockfile helpers
// ---------------------------------------------------------------------------

/**
 * Derives the package name of a lockfile `packages` key.
 *
 * @param {string} key Key such as `node_modules/a/node_modules/@s/b`.
 * @param {{name?: string}} entry Lockfile entry.
 * @returns {string} Package name.
 */
export function packageName(key, entry) {
  if (entry && typeof entry.name === 'string') return entry.name;
  const index = key.lastIndexOf('node_modules/');
  return index === -1 ? key : key.slice(index + 'node_modules/'.length);
}

/**
 * Returns the `packages` map of a lockfile (v2 or v3).
 *
 * @param {object} lock Parsed package-lock.json.
 * @returns {Record<string, object>} Packages keyed by install path.
 * @throws {Error} For lockfile version 1 or a missing `packages` map.
 */
export function lockPackages(lock) {
  if (!lock || typeof lock.packages !== 'object' || lock.packages === null) {
    throw new Error('package-lock.json has no "packages" map (lockfileVersion 2 or 3 needed)');
  }
  return lock.packages;
}

/**
 * Finds the entry npm would resolve for `name` when required from the package at `fromKey`,
 * walking up the node_modules folders like Node does.
 *
 * @param {Record<string, object>} packages Lockfile packages map.
 * @param {string} fromKey Install path of the requiring package ('' for the root).
 * @param {string} name Package name to resolve.
 * @returns {{key: string, entry: object} | null} Resolved entry, or null.
 */
export function resolveFrom(packages, fromKey, name) {
  let dir = fromKey;
  for (;;) {
    const key = dir ? `${dir}/node_modules/${name}` : `node_modules/${name}`;
    if (packages[key] && !packages[key].link) return { key, entry: packages[key] };
    if (packages[key] && packages[key].link && packages[packages[key].resolved]) {
      return { key, entry: packages[packages[key].resolved] };
    }
    if (!dir) return null;
    const index = dir.lastIndexOf('/node_modules/');
    dir = index === -1 ? '' : dir.slice(0, index);
    if (dir && !dir.includes('node_modules/')) dir = '';
  }
}

/**
 * Computes the difference between two lockfiles.
 *
 * @param {object} baseLock Parsed base package-lock.json.
 * @param {object} headLock Parsed head package-lock.json.
 * @returns {{added: Array, changed: Array, removed: string[], newNames: string[]}} Entries that
 *   were added or changed (with `key`, `name`, `entry`, `before`, `beforeKey`) and names new to
 *   the tree. For an added key, `before` is the base entry of the same name at another install
 *   path (same version preferred), so a package that only moved is compared with itself.
 */
export function diffLockfiles(baseLock, headLock) {
  const base = lockPackages(baseLock);
  const head = lockPackages(headLock);
  const byName = new Map();
  for (const [key, entry] of Object.entries(base)) {
    if (key === '') continue;
    const name = packageName(key, entry);
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push({ key, entry });
  }
  const added = [];
  const changed = [];
  const newNames = new Set();
  for (const [key, entry] of Object.entries(head)) {
    if (key === '') continue;
    const name = packageName(key, entry);
    if (!byName.has(name)) newNames.add(name);
    const before = base[key];
    if (!before) {
      const same = byName.get(name) || [];
      const prev = same.find((item) => item.entry.version === entry.version) || same[0] || null;
      added.push({ key, name, entry, before: prev && prev.entry, beforeKey: prev && prev.key });
    } else if (
      before.version !== entry.version ||
      before.resolved !== entry.resolved ||
      before.integrity !== entry.integrity
    ) {
      changed.push({ key, name, entry, before, beforeKey: key });
    }
  }
  const removed = Object.keys(base).filter((key) => key !== '' && !head[key]);
  return { added, changed, removed, newNames: [...newNames].sort() };
}

/**
 * Reads `engines.node` from a lockfile entry or registry manifest.
 *
 * @param {object} manifest Entry with an optional `engines` field.
 * @returns {string | null} The node range, or null when none is declared.
 */
function enginesNode(manifest) {
  const engines = manifest && manifest.engines;
  if (engines && typeof engines === 'object' && !Array.isArray(engines)) {
    return typeof engines.node === 'string' ? engines.node : null;
  }
  return null;
}

/**
 * Tells whether a lockfile entry is installed only for development.
 *
 * @param {object} entry Lockfile entry.
 * @returns {boolean} True for `dev` entries.
 */
const isDev = (entry) => entry.dev === true;

// ---------------------------------------------------------------------------
// Checks. Each returns a list of hold reasons: { code, message }.
// ---------------------------------------------------------------------------

const reason = (code, message) => ({ code, message });

/**
 * Supply-chain checks on the lockfile diff: install scripts, number of new packages and the
 * registry every changed entry resolves from.
 *
 * @param {object} diff Result of diffLockfiles.
 * @param {object} baseLock Parsed base lockfile.
 * @param {{maxNewPackages?: number}} [options] Thresholds.
 * @returns {{holds: object[], notes: string[]}} Hold reasons and informational notes.
 */
export function checkLockfileDanger(diff, baseLock, options = {}) {
  const max = options.maxNewPackages ?? MAX_NEW_PACKAGES;
  const base = lockPackages(baseLock);
  const scripted = new Set(
    Object.entries(base)
      .filter(([, entry]) => entry.hasInstallScript)
      .map(([key, entry]) => packageName(key, entry))
  );
  const holds = [];
  const notes = [];
  for (const item of [...diff.added, ...diff.changed]) {
    const { entry, name } = item;
    const label = `${name}@${entry.version ?? '?'}`;
    if (entry.hasInstallScript) {
      if (!scripted.has(name)) {
        holds.push(reason('install-script', `${label} adds an install script (hasInstallScript).`));
      } else notes.push(`${label} keeps its existing install script.`);
    }
    if (entry.link || entry.inBundle) continue;
    if (typeof entry.resolved !== 'string' || !entry.resolved.startsWith(REGISTRY_PREFIX)) {
      holds.push(
        reason('registry', `${label} does not resolve from ${REGISTRY_PREFIX} (${entry.resolved})`)
      );
    } else if (typeof entry.integrity !== 'string' || !/^sha512-/.test(entry.integrity)) {
      holds.push(reason('integrity', `${label} has no sha512 integrity hash in the lockfile.`));
    }
  }
  if (diff.newNames.length > max) {
    holds.push(
      reason(
        'new-packages',
        `${diff.newNames.length} packages are new to the tree (limit ${max}): ` +
          `${diff.newNames.slice(0, 20).join(', ')}${diff.newNames.length > 20 ? ', ...' : ''}`
      )
    );
  }
  return { holds, notes };
}

/**
 * Compatibility checks for every added or changed entry: `engines.node` must keep covering the
 * Node versions the plugin supports, and `peerDependencies` must stay satisfied by the installed
 * tree and, for production packages, by the plugin's own peer floor.
 *
 * @param {object} diff Result of diffLockfiles.
 * @param {object} context Inputs.
 * @param {object} context.baseLock Parsed base lockfile.
 * @param {object} context.headLock Parsed head lockfile.
 * @param {object} context.headPkg Parsed head package.json of the plugin.
 * @param {Record<string, object>} [context.registry] Registry manifests keyed `name@version`
 *   (from `npm view`), preferred over lockfile fields when present.
 * @returns {{holds: object[], notes: string[]}} Hold reasons and notes.
 */
export function checkCompatibility(diff, context) {
  const { baseLock, headLock, headPkg } = context;
  const registry = context.registry || {};
  const base = lockPackages(baseLock);
  const head = lockPackages(headLock);
  const holds = [];
  const notes = [];
  const supported = headPkg.engines && headPkg.engines.node;
  let samples = [];
  if (supported) {
    try {
      samples = nodeSamples(supported);
    } catch (error) {
      holds.push(reason('engines', `The plugin's engines.node cannot be parsed: ${error.message}`));
    }
  }
  const pluginPeers = headPkg.peerDependencies || {};
  const manifest = (name, entry) => ({ ...entry, ...(registry[`${name}@${entry.version}`] || {}) });

  for (const item of [...diff.added, ...diff.changed]) {
    const now = manifest(item.name, item.entry);
    const before = item.before ? manifest(item.name, item.before) : null;
    const label = `${item.name}@${now.version}`;

    // engines.node
    const newRange = enginesNode(now);
    const oldRange = before ? enginesNode(before) : null;
    if (newRange && newRange !== oldRange && samples.length) {
      try {
        const lost = samples.filter((sample) => {
          if (satisfies(sample, newRange)) return false;
          if (!oldRange) return true;
          try {
            return satisfies(sample, oldRange);
          } catch {
            return true;
          }
        });
        if (lost.length) {
          holds.push(
            reason(
              'engines',
              `${label} declares engines.node "${newRange}"` +
                `${oldRange ? ` (was "${oldRange}")` : ''}, which excludes Node ` +
                `${lost.join(', ')} supported by this plugin ("${supported}").`
            )
          );
        }
      } catch (error) {
        holds.push(reason('engines', `${label} engines.node "${newRange}": ${error.message}`));
      }
    }

    // peerDependencies
    const peers = now.peerDependencies || {};
    const oldPeers = (before && before.peerDependencies) || {};
    const meta = now.peerDependenciesMeta || {};
    for (const [peer, range] of Object.entries(peers)) {
      if (typeof range !== 'string') continue;
      const optional = Boolean(meta[peer] && meta[peer].optional);
      const installed = resolveFrom(head, item.key, peer);
      const oldInstalled = item.before ? resolveFrom(base, item.beforeKey, peer) : null;
      const oldRange2 = oldPeers[peer];
      let okNow;
      let okBefore;
      try {
        okNow = installed ? satisfies(installed.entry.version, range) : optional;
      } catch {
        okNow = false;
      }
      try {
        okBefore =
          typeof oldRange2 === 'string'
            ? oldInstalled
              ? satisfies(oldInstalled.entry.version, oldRange2)
              : Boolean(before.peerDependenciesMeta?.[peer]?.optional)
            : false;
      } catch {
        okBefore = false;
      }
      if (!okNow && (okBefore || typeof oldRange2 !== 'string')) {
        holds.push(
          reason(
            'peer',
            `${label} needs peer ${peer}@"${range}"` +
              `${oldRange2 ? ` (was "${oldRange2}")` : ' (new peer)'}, but the tree has ` +
              `${installed ? `${peer}@${installed.entry.version}` : 'none installed'}.`
          )
        );
        continue;
      }
      if (!okNow) notes.push(`${label}: peer ${peer}@"${range}" was already unmet before.`);
      if (isDev(item.entry) || typeof pluginPeers[peer] !== 'string' || range === oldRange2) {
        continue;
      }
      try {
        const floor = minVersion(pluginPeers[peer]);
        const floorOk = floor ? satisfies(floor, range) : true;
        const floorOkBefore =
          floor && typeof oldRange2 === 'string' ? satisfies(floor, oldRange2) : true;
        if (!floorOk && floorOkBefore) {
          holds.push(
            reason(
              'peer-floor',
              `${label} is shipped to hosts and needs ${peer}@"${range}", above this ` +
                `plugin's declared peer floor ${peer}@${floor} ("${pluginPeers[peer]}").`
            )
          );
        }
      } catch (error) {
        holds.push(reason('peer-floor', `${label} peer ${peer}: ${error.message}`));
      }
    }
  }
  return { holds, notes };
}

/**
 * Direct dependency version changes, with major and 0.x checks.
 *
 * @param {object} context Inputs.
 * @param {object} context.baseLock Parsed base lockfile.
 * @param {object} context.headLock Parsed head lockfile.
 * @param {object} context.headPkg Parsed head package.json.
 * @returns {{holds: object[], majors: string[], direct: Array}} Hold reasons, major updates and
 *   the list of direct updates `{ name, type, from, to }`.
 */
export function checkDirectUpdates(context) {
  const base = lockPackages(context.baseLock);
  const head = lockPackages(context.headLock);
  const holds = [];
  const majors = [];
  const direct = [];
  const types = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const seen = new Set();
  for (const type of types) {
    for (const name of Object.keys(context.headPkg[type] || {})) {
      if (seen.has(name)) continue;
      seen.add(name);
      const before = base[`node_modules/${name}`];
      const after = head[`node_modules/${name}`];
      if (!before || !after || before.version === after.version) continue;
      direct.push({ name, type, from: before.version, to: after.version });
      const a = parseVersion(before.version);
      const b = parseVersion(after.version);
      if (!a || !b) {
        holds.push(
          reason('version', `${name}: cannot compare ${before.version} -> ${after.version}`)
        );
        continue;
      }
      if (a.major !== b.major) majors.push(`${name} ${before.version} -> ${after.version}`);
      else if (
        type === 'dependencies' &&
        a.major === 0 &&
        (a.minor !== b.minor || (a.minor === 0 && a.patch !== b.patch))
      ) {
        holds.push(
          reason(
            'zero-minor',
            `${name} ${before.version} -> ${after.version} is a runtime dependency on 0.x; ` +
              'a 0.x minor (or 0.0.x patch) bump is breaking by semver convention.'
          )
        );
      }
    }
  }
  return { holds, majors, direct };
}

const BREAKING_RE = /(?<![a-z-])breaking(?:[ _-]?changes?)?(?![a-z])/i;

/**
 * Looks for breaking-change wording in the Dependabot PR body (release notes, changelog).
 *
 * @param {string} body PR body.
 * @returns {object[]} Hold reasons (at most one).
 */
export function checkBreakingText(body) {
  const text = typeof body === 'string' ? body.slice(0, 200000) : '';
  const match = BREAKING_RE.exec(text);
  if (!match) return [];
  const start = Math.max(0, match.index - 60);
  const excerpt = text
    .slice(start, match.index + 80)
    .replace(/[\r\n`]+/g, ' ')
    .trim();
  return [
    reason('breaking-text', `The PR body / release notes mention "${match[0]}": "${excerpt}"`),
  ];
}

/**
 * Normalizes a packed file path so that content hashes in chunk names do not count as a change.
 *
 * @param {string} file Path from `npm pack --dry-run --json`.
 * @returns {string} Normalized path.
 */
export function normalizePackPath(file) {
  return file.replace(/-[A-Za-z0-9_-]{8}(?=(?:\.[A-Za-z]+)+$)/, '-[hash]');
}

/**
 * Compares the published surface of base and head.
 *
 * @param {object | null} baseSurface Surface recorded for the merge base.
 * @param {object | null} headSurface Surface recorded for the PR head.
 * @returns {object[]} Hold reasons.
 */
export function checkSurface(baseSurface, headSurface) {
  if (!baseSurface || !headSurface) {
    return [reason('surface', 'The published surface could not be recorded for base and head.')];
  }
  const holds = [];
  const keys = new Set([...Object.keys(baseSurface), ...Object.keys(headSurface)]);
  for (const key of [...keys].sort()) {
    const a = baseSurface[key];
    const b = headSurface[key];
    if (key === 'files') {
      const before = new Set(a || []);
      const after = new Set(b || []);
      const plus = [...after].filter((file) => !before.has(file));
      const minus = [...before].filter((file) => !after.has(file));
      if (plus.length || minus.length) {
        holds.push(
          reason(
            'surface',
            `npm pack file list changed: ${plus.map((f) => `+${f}`).join(', ')}` +
              `${plus.length && minus.length ? ', ' : ''}${minus.map((f) => `-${f}`).join(', ')}`
          )
        );
      }
    } else if (stableStringify(a) !== stableStringify(b)) {
      holds.push(reason('surface', `Published "${key}" changed between base and head.`));
    }
  }
  return holds;
}

/**
 * JSON.stringify with sorted object keys.
 *
 * @param {unknown} value Any JSON value.
 * @returns {string} Canonical JSON.
 */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

/**
 * Danger checks on the dependency-graph comparison (the data behind
 * actions/dependency-review-action): vulnerabilities of moderate or higher and licenses outside
 * the allowlist. MPL-2.0 and CC-BY are accepted for development dependencies only.
 *
 * @param {Array | null} changes Response of `GET /repos/{repo}/dependency-graph/compare/{basehead}`.
 * @returns {{holds: object[], notes: string[]}} Hold reasons and notes.
 */
export function checkDependencyReview(changes) {
  if (!Array.isArray(changes)) {
    return {
      holds: [reason('dependency-review', 'The dependency-graph comparison is not available.')],
      notes: [],
    };
  }
  const holds = [];
  const notes = [];
  for (const change of changes) {
    if (change.change_type !== 'added') continue;
    const label = `${change.name}@${change.version}`;
    for (const vuln of change.vulnerabilities || []) {
      if ((SEVERITY_RANK[vuln.severity] || 0) >= SEVERITY_RANK.moderate) {
        holds.push(
          reason(
            'vulnerability',
            `${label} has a ${vuln.severity} advisory ${vuln.advisory_ghsa_id}: ${vuln.advisory_summary}`
          )
        );
      }
    }
    const license = change.license;
    if (licenseException(change.name)) continue;
    if (license === null || license === undefined || license === 'NOASSERTION') {
      notes.push(`${label}: no license detected (not blocking, as in dependency-review-action).`);
      continue;
    }
    const dev = change.scope === 'development';
    const allowed = dev ? [...ALLOWED_LICENSES, ...DEV_ONLY_LICENSES] : ALLOWED_LICENSES;
    let ok;
    try {
      ok = licenseAllowed(license, allowed);
    } catch {
      ok = false;
    }
    if (!ok) {
      holds.push(
        reason('license', `${label} (${change.scope || 'unknown'} scope) has license "${license}".`)
      );
    }
  }
  return { holds, notes };
}

/**
 * Runs every check and returns the decision.
 *
 * @param {object} input Inputs (all data, no code from the PR is executed).
 * @param {object} input.baseLock Parsed merge-base package-lock.json.
 * @param {object} input.headLock Parsed head package-lock.json.
 * @param {object} input.basePkg Parsed merge-base package.json.
 * @param {object} input.headPkg Parsed head package.json.
 * @param {object | null} input.baseSurface Surface of the merge base, or null.
 * @param {object | null} input.headSurface Surface of the head, or null.
 * @param {string} input.prBody Dependabot PR body.
 * @param {Array | null} input.reviewChanges Dependency-graph comparison, or null.
 * @param {string} input.reviewOutcome Outcome of actions/dependency-review-action.
 * @param {number} input.signaturesExit Exit code of `npm audit signatures`.
 * @param {Record<string, object>} [input.registry] `npm view` manifests keyed `name@version`.
 * @param {number} [input.maxNewPackages] Threshold for new packages.
 * @returns {{decision: 'merge' | 'hold' | 'major', reasons: object[], notes: string[],
 *   majors: string[], direct: Array}} Decision with reasons.
 */
export function decide(input) {
  const reasons = [];
  const notes = [];
  let diff;
  try {
    diff = diffLockfiles(input.baseLock, input.headLock);
  } catch (error) {
    return {
      decision: 'hold',
      reasons: [reason('lockfile', error.message)],
      notes,
      majors: [],
      direct: [],
    };
  }
  const direct = checkDirectUpdates(input);
  reasons.push(...direct.holds);
  const compat = checkCompatibility(diff, input);
  reasons.push(...compat.holds);
  notes.push(...compat.notes);
  const danger = checkLockfileDanger(diff, input.baseLock, input);
  reasons.push(...danger.holds);
  notes.push(...danger.notes);
  reasons.push(...checkBreakingText(input.prBody));
  reasons.push(...checkSurface(input.baseSurface, input.headSurface));
  const review = checkDependencyReview(input.reviewChanges);
  reasons.push(...review.holds);
  notes.push(...review.notes);
  if (input.reviewOutcome !== 'success') {
    reasons.push(
      reason(
        'dependency-review',
        `actions/dependency-review-action finished with "${input.reviewOutcome}" (see job summary).`
      )
    );
  }
  if (input.signaturesExit !== 0) {
    reasons.push(
      reason('signatures', '`npm audit signatures` reported missing or invalid signatures.')
    );
  }
  for (const field of ['peerDependencies', 'engines']) {
    if (stableStringify(input.basePkg[field]) !== stableStringify(input.headPkg[field])) {
      reasons.push(reason('surface', `package.json "${field}" changed in this update.`));
    }
  }
  const decision = direct.majors.length ? 'major' : reasons.length ? 'hold' : 'merge';
  return { decision, reasons, notes, majors: direct.majors, direct: direct.direct };
}

/**
 * Combines the gate decision, the Dependabot metadata and the job results into one action.
 * Only an explicit patch or minor update with a green verify job and a `merge` decision may go on
 * to wait for CI and merge.
 *
 * @param {object} input Inputs.
 * @param {string} input.updateType `update-type` from dependabot/fetch-metadata.
 * @param {string} input.verifyResult Result of the verify job.
 * @param {string} input.gateResult Result of the gate job.
 * @param {string} input.decision Decision of the gate job.
 * @param {object[]} input.reasons Hold reasons of the gate job.
 * @returns {{action: 'merge' | 'hold' | 'major', reasons: object[]}} The action to take.
 */
export function route(input) {
  if (input.updateType === 'version-update:semver-major' || input.decision === 'major') {
    return { action: 'major', reasons: [] };
  }
  const reasons = [];
  if (input.verifyResult !== 'success') {
    reasons.push(reason('verify', `The verify job finished with "${input.verifyResult}".`));
  }
  if (input.gateResult !== 'success') {
    reasons.push(reason('gate', `The dependency gate job finished with "${input.gateResult}".`));
  }
  const known = ['version-update:semver-patch', 'version-update:semver-minor'];
  if (!known.includes(input.updateType)) {
    reasons.push(
      reason('update-type', `Dependabot reported update-type "${input.updateType || 'none'}".`)
    );
  }
  if (input.gateResult === 'success' && input.decision !== 'merge') {
    reasons.push(...(Array.isArray(input.reasons) ? input.reasons : []));
    if (!input.reasons || !input.reasons.length) {
      reasons.push(reason('gate', `Gate decision "${input.decision}".`));
    }
  }
  return reasons.length ? { action: 'hold', reasons } : { action: 'merge', reasons };
}

// ---------------------------------------------------------------------------
// CI status evaluation for wait-ci
// ---------------------------------------------------------------------------

const OK_CONCLUSIONS = new Set(['success', 'skipped', 'neutral']);

/**
 * Evaluates the state of every other check on the head commit.
 *
 * @param {object} input Data from the GitHub REST API.
 * @param {Array} input.runs `workflow_runs` for the head SHA.
 * @param {Array} input.checkRuns `check_runs` for the head SHA (latest per name).
 * @param {{state?: string, total_count?: number, statuses?: Array}} [input.status] Combined status.
 * @param {number} input.ownWorkflowId Workflow id of this gate workflow (excluded).
 * @returns {{state: 'success' | 'pending' | 'failure', failing: string[], pending: string[],
 *   counted: number}} Evaluation.
 */
export function evaluateChecks(input) {
  const own = (input.runs || []).filter((run) => run.workflow_id === input.ownWorkflowId);
  const ownSuites = new Set(own.map((run) => run.check_suite_id));
  const latest = new Map();
  for (const run of input.runs || []) {
    if (run.workflow_id === input.ownWorkflowId) continue;
    const key = `${run.workflow_id}:${run.event}`;
    const prev = latest.get(key);
    const newer =
      !prev ||
      run.run_number > prev.run_number ||
      (run.run_number === prev.run_number && (run.run_attempt || 1) > (prev.run_attempt || 1));
    if (newer) latest.set(key, run);
  }
  const latestSuites = new Set([...latest.values()].map((run) => run.check_suite_id));
  const actionsSuites = new Set((input.runs || []).map((run) => run.check_suite_id));
  const failing = [];
  const pending = [];
  for (const run of latest.values()) {
    const label = `workflow "${run.name}" (${run.event})`;
    if (run.status !== 'completed') pending.push(label);
    else if (!OK_CONCLUSIONS.has(run.conclusion)) failing.push(`${label}: ${run.conclusion}`);
  }
  for (const check of input.checkRuns || []) {
    const suite = check.check_suite && check.check_suite.id;
    if (ownSuites.has(suite)) continue;
    // Check runs of superseded workflow runs are represented by their latest run.
    if (actionsSuites.has(suite) && !latestSuites.has(suite)) continue;
    const label = `check "${check.name}"`;
    if (check.status !== 'completed') pending.push(label);
    else if (!OK_CONCLUSIONS.has(check.conclusion)) failing.push(`${label}: ${check.conclusion}`);
  }
  const status = input.status || {};
  if (status.total_count > 0) {
    for (const item of status.statuses || []) {
      if (item.state === 'pending') pending.push(`status "${item.context}"`);
      else if (item.state !== 'success') failing.push(`status "${item.context}": ${item.state}`);
    }
  }
  const counted = latest.size;
  if (failing.length) return { state: 'failure', failing, pending, counted };
  if (pending.length || counted === 0) return { state: 'pending', failing, pending, counted };
  return { state: 'success', failing, pending, counted };
}

/**
 * Calls the GitHub REST API.
 *
 * @param {string} route Path such as `/repos/o/r/actions/runs/1`.
 * @param {string} token GITHUB_TOKEN.
 * @returns {Promise<any>} Parsed JSON.
 * @throws {Error} When the response is not 2xx.
 * @sideeffect Network request to api.github.com.
 */
async function githubApi(route, token) {
  const base = process.env.GITHUB_API_URL || 'https://api.github.com';
  const response = await globalThis.fetch(`${base}${route}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${route} answered ${response.status}`);
  return response.json();
}

/**
 * Fetches all pages of a list endpoint.
 *
 * @param {string} route Path with query string, without page parameters.
 * @param {string} key Array property of the response.
 * @param {string} token GITHUB_TOKEN.
 * @returns {Promise<Array>} All items (at most 1000).
 * @sideeffect Network requests to api.github.com.
 */
async function githubList(route, key, token) {
  const items = [];
  for (let page = 1; page <= 10; page += 1) {
    const sep = route.includes('?') ? '&' : '?';
    const body = await githubApi(`${route}${sep}per_page=100&page=${page}`, token);
    const list = body[key] || [];
    items.push(...list);
    if (list.length < 100) break;
  }
  return items;
}

/**
 * Polls the head commit until every other workflow run, check run and commit status has
 * finished. Success needs two consecutive green polls, so a workflow that starts late is seen.
 *
 * @param {object} options Options.
 * @param {string} options.repo `owner/name`.
 * @param {string} options.sha Head commit SHA.
 * @param {number} options.runId This workflow run id.
 * @param {string} options.token GITHUB_TOKEN with actions, checks and statuses read.
 * @param {number} [options.timeoutMs] Give up after this long (default 60 minutes).
 * @param {number} [options.intervalMs] Poll interval (default 30 seconds).
 * @param {Function} [options.log] Logger.
 * @returns {Promise<{state: string, failing: string[], pending: string[]}>} Final state:
 *   `success`, `failure` or `timeout`.
 * @sideeffect Network requests to api.github.com; waits.
 */
export async function waitForChecks(options) {
  const { repo, sha, runId, token } = options;
  const log = options.log || (() => {});
  const timeoutMs = options.timeoutMs ?? 60 * 60 * 1000;
  const intervalMs = options.intervalMs ?? 30 * 1000;
  const self = await githubApi(`/repos/${repo}/actions/runs/${runId}`, token);
  const deadline = Date.now() + timeoutMs;
  let greens = 0;
  let last = { state: 'pending', failing: [], pending: [] };
  while (Date.now() < deadline) {
    const runs = await githubList(
      `/repos/${repo}/actions/runs?head_sha=${sha}`,
      'workflow_runs',
      token
    );
    const checkRuns = await githubList(
      `/repos/${repo}/commits/${sha}/check-runs`,
      'check_runs',
      token
    );
    const status = await githubApi(`/repos/${repo}/commits/${sha}/status`, token);
    last = evaluateChecks({ runs, checkRuns, status, ownWorkflowId: self.workflow_id });
    log(`CI state ${last.state}; pending: ${last.pending.length}; failing: ${last.failing.length}`);
    if (last.state === 'failure') return last;
    greens = last.state === 'success' ? greens + 1 : 0;
    if (greens >= 2) return last;
    await sleep(intervalMs);
  }
  return { ...last, state: 'timeout' };
}

// ---------------------------------------------------------------------------
// Published surface (runs in the read-only surface job)
// ---------------------------------------------------------------------------

/**
 * Describes the shape of a loaded module: types of top-level exports and the keys of nested
 * objects (two levels), without values.
 *
 * @param {unknown} value Module value.
 * @param {number} [depth] Remaining depth.
 * @returns {unknown} Shape.
 */
export function describeShape(value, depth = 2) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  const type = typeof value;
  if ((type !== 'object' && type !== 'function') || depth === 0) return type;
  const keys = Object.keys(value).sort().slice(0, 200);
  if (type === 'function' && !keys.length) return 'function';
  const shape = {};
  for (const key of keys) shape[key] = describeShape(value[key], depth - 1);
  return type === 'function' ? { '(function)': shape } : shape;
}

/**
 * Lists the static export names of an ES module file (bundler output).
 *
 * @param {string} source File content.
 * @returns {string[]} Sorted export names.
 */
export function staticExports(source) {
  const names = new Set();
  const text = source.slice(0, 5 * 1024 * 1024);
  for (const match of text.matchAll(/^export\s*\{([^}]{0,5000})\}/gm)) {
    for (const part of match[1].split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop();
      if (name) names.add(name);
    }
  }
  const declRe =
    /^export\s+(?:default|(?:async\s+)?function\*?\s+(\w+)|class\s+(\w+)|(?:const|let|var)\s+(\w+))/gm;
  for (const match of text.matchAll(declRe)) {
    names.add(match[1] || match[2] || match[3] || 'default');
  }
  if (/^export\s*\*\s*from/m.test(text)) names.add('*');
  return [...names].sort();
}

/**
 * Collects the files referenced by a package.json `exports` map.
 *
 * @param {unknown} exportsField `exports` value.
 * @returns {string[]} Relative file paths.
 */
function exportTargets(exportsField) {
  const out = new Set();
  const walk = (value, condition) => {
    if (typeof value === 'string') {
      if (condition !== 'source' && condition !== 'types') out.add(value);
    } else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) walk(inner, key);
    }
  };
  walk(exportsField, '');
  return [...out].sort();
}

/**
 * Records the published surface of a built checkout: normalized `npm pack` file list, the
 * package.json fields hosts depend on, static exports of every entry file and the runtime shape
 * of every CommonJS entry.
 *
 * @param {string} dir Checkout directory (already installed and built).
 * @returns {object} Surface description.
 * @throws {Error} When `npm pack --dry-run` fails.
 * @sideeffect Runs `npm pack --dry-run --ignore-scripts` and loads built entry files in child
 *   processes (code from the checkout runs here; the workflow gives this job no write access).
 */
export function recordSurface(dir) {
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const packJson = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const packed = JSON.parse(packJson);
  const files = [
    ...new Set(packed.flatMap((entry) => entry.files.map((f) => normalizePackPath(f.path)))),
  ].sort();
  const fields = {};
  for (const key of ['main', 'module', 'types', 'type', 'bin', 'exports', 'files']) {
    fields[key] = pkg[key] ?? null;
  }
  const entries = {};
  const shapes = {};
  for (const target of exportTargets(pkg.exports)) {
    const file = path.join(dir, target);
    if (!/\.(c|m)?js$/.test(target) || !existsSync(file) || statSync(file).size > 20e6) {
      entries[target] = existsSync(file) ? 'not-js' : 'missing';
      continue;
    }
    entries[target] = staticExports(readFileSync(file, 'utf8'));
    if (target.endsWith('.mjs')) continue;
    shapes[target] = loadShape(dir, target);
  }
  return {
    files,
    package: fields,
    peerDependencies: pkg.peerDependencies ?? null,
    engines: pkg.engines ?? null,
    entries,
    shapes,
  };
}

/**
 * Loads one CommonJS entry in a child process and returns its shape, or an error code.
 *
 * @param {string} dir Checkout directory.
 * @param {string} target Relative entry path.
 * @returns {unknown} Shape or `{ error: <code or name> }`.
 * @sideeffect Starts a Node.js child process that requires the entry (60 s timeout).
 */
function loadShape(dir, target) {
  const self = import.meta.url;
  const code =
    `import(${JSON.stringify(self)}).then(({ describeShape }) => {` +
    `const mod = require(${JSON.stringify(path.resolve(dir, target))});` +
    'process.stdout.write(JSON.stringify(describeShape(mod)));' +
    '}).catch((e) => { process.stdout.write(JSON.stringify({ error: e.code || e.name })); });';
  try {
    const out = execFileSync(process.execPath, ['-e', code], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 60000,
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { PATH: process.env.PATH, NODE_ENV: 'production' },
    });
    return JSON.parse(out.trim().split('\n').pop() || 'null');
  } catch (error) {
    return { error: error.code || error.name || 'load-failed' };
  }
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------

/**
 * Renders the PR comment for a hold.
 *
 * @param {object[]} reasons Hold reasons.
 * @param {string[]} [notes] Informational notes.
 * @returns {string} Markdown.
 */
export function renderHold(reasons, notes = []) {
  const clean = (text) =>
    String(text)
      .replace(/[\r\n]+/g, ' ')
      .slice(0, 600);
  const lines = [
    '**Dependency gate: held for review (not merged automatically).**',
    '',
    'All of these must be checked by a person before this update is merged:',
    '',
    ...reasons.slice(0, 50).map((r) => `- \`${r.code}\`: ${clean(r.message)}`),
  ];
  if (notes.length) {
    lines.push('', '<details><summary>Notes</summary>', '');
    lines.push(...notes.slice(0, 50).map((n) => `- ${clean(n)}`), '', '</details>');
  }
  lines.push(
    '',
    'Gate rules: `.github/scripts/dependency-gate.mjs`. ' +
      'After review, merge by hand or ask Dependabot to recreate the PR.'
  );
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/**
 * Parses `--key value` arguments.
 *
 * @param {string[]} argv Arguments after the subcommand.
 * @returns {Record<string, string>} Options.
 * @throws {Error} For an option without a value.
 */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || argv[i + 1] === undefined) {
      throw new Error(`bad argument ${argv[i]}`);
    }
    out[argv[i].slice(2)] = argv[i + 1];
  }
  return out;
}

/**
 * Reads a JSON file with a size limit; returns null for a missing file.
 *
 * @param {string | undefined} file Path.
 * @returns {any} Parsed JSON or null.
 * @throws {Error} When the file is too large or not valid JSON.
 */
function readJson(file) {
  if (!file || !existsSync(file)) return null;
  if (statSync(file).size > MAX_JSON_BYTES) throw new Error(`${file} is too large`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Writes `key=value` lines (heredoc form for multi-line values) to $GITHUB_OUTPUT.
 *
 * @param {Record<string, string>} values Outputs.
 * @returns {void}
 * @sideeffect Appends to the file named by $GITHUB_OUTPUT, or prints when it is not set.
 */
function setOutputs(values) {
  const file = process.env.GITHUB_OUTPUT;
  for (const [key, value] of Object.entries(values)) {
    const text = String(value);
    const line = text.includes('\n') ? `${key}<<GATE_EOF\n${text}\nGATE_EOF\n` : `${key}=${text}\n`;
    if (file) appendFileSync(file, line);
    else process.stdout.write(line);
  }
}

/**
 * Parses a JSON array passed through an environment variable.
 *
 * @param {string | undefined} text JSON text.
 * @param {Array} fallback Value for invalid input.
 * @returns {Array} Parsed array or the fallback.
 */
function parseList(text, fallback) {
  try {
    const value = JSON.parse(text || '[]');
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Fetches `engines` and `peerDependencies` from the registry for every direct dependency that
 * changed, old and new version, with `npm view`.
 *
 * @param {Array<{name: string, from: string, to: string}>} direct Direct updates.
 * @returns {Record<string, object>} Manifests keyed `name@version`.
 * @sideeffect Runs `npm view` (network access to the npm registry).
 */
function registryManifests(direct) {
  const out = {};
  for (const { name, from, to } of direct.slice(0, 40)) {
    for (const version of [from, to]) {
      try {
        const json = execFileSync(
          'npm',
          [
            'view',
            `${name}@${version}`,
            'engines',
            'peerDependencies',
            'peerDependenciesMeta',
            '--json',
          ],
          { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] }
        );
        const data = json.trim() ? JSON.parse(json) : {};
        out[`${name}@${version}`] = Array.isArray(data) ? data[data.length - 1] : data;
      } catch {
        // Fall back to the lockfile copy of the same fields.
      }
    }
  }
  return out;
}

/**
 * CLI entry point.
 *
 * @param {string[]} argv Process arguments after the script path.
 * @returns {Promise<number>} Exit code.
 * @throws {Error} For unknown subcommands or invalid arguments.
 * @sideeffect Reads and writes files, writes to $GITHUB_OUTPUT, may call the network.
 */
export async function main(argv) {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  const print = (text) => process.stdout.write(`${text}\n`);
  if (command === 'policy') {
    setOutputs({
      'allow-licenses': [...ALLOWED_LICENSES, ...DEV_ONLY_LICENSES].join(', '),
      'allow-dependencies-licenses': LICENSE_EXCEPTIONS.map(
        (name) => `pkg:npm/${name.startsWith('@') ? `%40${name.slice(1)}` : name}`
      ).join(', '),
    });
    return 0;
  }
  if (command === 'surface') {
    const surface = recordSurface(path.resolve(args.dir));
    writeFileSync(args.out, `${JSON.stringify(surface, null, 2)}\n`);
    print(`surface: ${surface.files.length} files, ${Object.keys(surface.entries).length} entries`);
    return 0;
  }
  if (command === 'decide') {
    const input = {
      baseLock: readJson(args['base-lock']),
      headLock: readJson(args['head-lock']),
      basePkg: readJson(args['base-pkg']) || {},
      headPkg: readJson(args['head-pkg']) || {},
      baseSurface: readJson(args['base-surface']),
      headSurface: readJson(args['head-surface']),
      prBody: args['pr-body'] ? readFileSync(args['pr-body'], 'utf8') : '',
      reviewChanges: readJson(args['review-changes']),
      reviewOutcome: args['review-outcome'] || 'missing',
      signaturesExit: Number(args['signatures-exit'] ?? 1),
    };
    if (args.registry !== 'off' && input.baseLock && input.headLock) {
      try {
        input.registry = registryManifests(checkDirectUpdates(input).direct);
      } catch {
        input.registry = {};
      }
    }
    const result = decide(input);
    if (args.out) writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`);
    print(`decision: ${result.decision}`);
    for (const r of result.reasons) print(`  hold ${r.code}: ${r.message}`);
    for (const n of result.notes) print(`  note: ${n}`);
    setOutputs({
      decision: result.decision,
      reasons: JSON.stringify(result.reasons.slice(0, 50)),
      notes: JSON.stringify(result.notes.slice(0, 50)),
    });
    return 0;
  }
  if (command === 'route') {
    const unreadable = [reason('gate', 'Gate reasons could not be read.')];
    const reasons = parseList(process.env.GATE_REASONS, unreadable);
    const notes = parseList(process.env.GATE_NOTES, []);
    const result = route({
      updateType: process.env.UPDATE_TYPE,
      verifyResult: process.env.VERIFY_RESULT,
      gateResult: process.env.GATE_RESULT,
      decision: process.env.GATE_DECISION,
      reasons,
    });
    print(`action: ${result.action}`);
    if (args.comment) writeFileSync(args.comment, `${renderHold(result.reasons, notes)}\n`);
    setOutputs({ action: result.action });
    return 0;
  }
  if (command === 'wait-ci') {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN is required');
    const result = await waitForChecks({
      repo: args.repo,
      sha: args.sha,
      runId: Number(args['run-id']),
      token,
      timeoutMs: Number(args['timeout-minutes'] ?? 60) * 60 * 1000,
      intervalMs: Number(args['interval-seconds'] ?? 30) * 1000,
      log: print,
    });
    print(`CI result: ${result.state}`);
    for (const item of result.failing) print(`  failing: ${item}`);
    for (const item of result.pending) print(`  pending: ${item}`);
    if (args.comment && result.state !== 'success') {
      const reasons = [
        ...result.failing.map((item) => reason('ci', item)),
        ...(result.state === 'timeout'
          ? result.pending.map((item) => reason('ci-timeout', item))
          : []),
      ];
      writeFileSync(args.comment, `${renderHold(reasons)}\n`);
    }
    setOutputs({ state: result.state });
    return 0;
  }
  if (command === 'review-changes') {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN is required');
    const basehead = `${args.base}...${args.head}`;
    try {
      const changes = await githubApi(
        `/repos/${args.repo}/dependency-graph/compare/${basehead}`,
        token
      );
      writeFileSync(args.out, `${JSON.stringify(changes)}\n`);
      print(`dependency-graph compare: ${changes.length} changes`);
    } catch (error) {
      print(`dependency-graph compare failed: ${error.message}`);
    }
    return 0;
  }
  throw new Error(`unknown command "${command}"`);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`dependency-gate: ${error.message}\n`);
      process.exitCode = 1;
    }
  );
}
