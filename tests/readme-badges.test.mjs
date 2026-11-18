import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

/**
 * Badge row contract. Every plugin README starts with the same six shields.io badges in the
 * same order (npm version, monthly downloads, CI, license, Strapi floor, docs site). The README
 * ships in the npm package and is rendered on npmjs.com and the Strapi marketplace, which do not
 * resolve relative URLs, so every badge image and link is absolute. The Strapi badge must state
 * the floor of the @strapi/strapi peer dependency and the npm badges must name this package.
 */

const WORKFLOW = 'release.yml';
const COMPAT_ANCHOR = 'requirements';

const read = (file) => readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');
const slug = pkg.repository.url.match(/github\.com\/([^/]+\/[^/.]+)/)[1];
const BADGE_LINE = /^\[!\[([^\]]+)\]\((\S+)\)\]\((\S+)\)$/;

/**
 * Reads the first block of consecutive badge lines above the first "## " heading.
 *
 * @returns {{ alt: string, img: string, href: string }[]} The badges in README order.
 */
function badgeRow() {
  const lines = readme.split('\n');
  const end = lines.findIndex((line) => line.startsWith('## '));
  const head = lines.slice(0, end === -1 ? lines.length : end);
  const start = head.findIndex((line) => BADGE_LINE.test(line));
  const row = [];
  for (let i = start; i >= 0 && i < head.length && BADGE_LINE.test(head[i]); i += 1) {
    const [, alt, img, href] = head[i].match(BADGE_LINE);
    row.push({ alt, img, href });
  }
  return row;
}

/**
 * Turns the @strapi/strapi peer range into the floor shown on the badge, e.g. "^5.24.0" -> "5.24".
 *
 * @returns {string} The supported Strapi floor.
 */
function strapiFloor() {
  const range = pkg.peerDependencies['@strapi/strapi'];
  const match = range.match(/^(?:\^|~|>=)?\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `unexpected @strapi/strapi peer range: ${range}`);
  return match[3] === '0' ? `${match[1]}.${match[2]}` : `${match[1]}.${match[2]}.${match[3]}`;
}

const shield = (text) => encodeURIComponent(text.replace(/-/g, '--').replace(/_/g, '__'));

test('README starts with the six-badge row in the shared order', () => {
  const row = badgeRow();
  assert.deepEqual(
    row.map((badge) => badge.alt),
    [
      'npm version',
      'npm downloads',
      'CI build status',
      `License: ${pkg.license}`,
      `Strapi ${strapiFloor()}+`,
      'Documentation site',
    ]
  );
});

test('every badge image and link is an absolute https URL', () => {
  for (const { alt, img, href } of badgeRow()) {
    assert.match(img, /^https:\/\/img\.shields\.io\//, `${alt}: image must be a shields.io URL`);
    assert.match(href, /^https:\/\//, `${alt}: link must be absolute`);
  }
});

test('npm badges point at this package', () => {
  const [version, downloads] = badgeRow();
  const page = `https://www.npmjs.com/package/${pkg.name}`;
  assert.equal(version.img, `https://img.shields.io/npm/v/${pkg.name}.svg`);
  assert.equal(version.href, page);
  assert.equal(downloads.img, `https://img.shields.io/npm/dm/${pkg.name}.svg`);
  assert.equal(downloads.href, page);
});

test('CI badge shows a workflow that runs on main', () => {
  const ci = badgeRow()[2];
  assert.equal(
    ci.img,
    `https://img.shields.io/github/actions/workflow/status/${slug}/${WORKFLOW}?branch=main&label=CI&logo=github`
  );
  assert.equal(ci.href, `https://github.com/${slug}/actions/workflows/${WORKFLOW}?query=branch%3Amain`);
  const workflow = read(path.join('.github/workflows', WORKFLOW));
  assert.match(workflow, /^\s+push:/m, `${WORKFLOW} must run on push`);
  assert.doesNotMatch(workflow, /branches-ignore:\s*\n\s*-\s*main\b/, `${WORKFLOW} must run on main`);
});

test('license badge matches package.json and links to the LICENSE file', () => {
  const license = badgeRow()[3];
  assert.equal(license.img, `https://img.shields.io/badge/License-${shield(pkg.license)}-blue.svg`);
  assert.equal(license.href, `https://github.com/${slug}/blob/main/LICENSE`);
  assert.ok(existsSync(path.join(root, 'LICENSE')), 'LICENSE file is missing');
});

test('Strapi badge states the @strapi/strapi peer floor and links to the compatibility section', () => {
  const strapi = badgeRow()[4];
  assert.equal(strapi.img, `https://img.shields.io/badge/Strapi-${shield(`${strapiFloor()}+`)}-4945FF.svg`);
  assert.equal(strapi.href, `https://github.com/${slug}#${COMPAT_ANCHOR}`);
  const headings = readme
    .split('\n')
    .filter((line) => /^#{2,3} /.test(line))
    .map((line) =>
      line
        .replace(/^#+ /, '')
        .trim()
        .toLowerCase()
        .replace(/[^\w\- ]/g, '')
        .replace(/ /g, '-')
    );
  assert.ok(headings.includes(COMPAT_ANCHOR), `README has no "${COMPAT_ANCHOR}" heading`);
});

test('docs badge links to the project site', () => {
  const docs = badgeRow()[5];
  assert.equal(docs.img, 'https://img.shields.io/badge/docs-project%20site-6d4aff.svg');
  assert.equal(docs.href, pkg.homepage);
  assert.match(pkg.homepage, /^https:\/\/[\w-]+\.github\.io\/[\w-]+\/$/);
});
