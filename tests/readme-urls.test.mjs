/**
 * README link and image checks.
 *
 * The Strapi marketplace (community.strapi.io/marketplace) and npmjs.com render
 * the README.md shipped in the npm package. Neither resolves relative paths
 * against the repository: `./pics/settings.png` became
 * `community.strapi.io/marketplace/pics/settings.png` (404), so none of the
 * 6.0.x screenshots showed and `./LICENSE`, `./CHANGELOG.md` and
 * `./CONTRIBUTING.md` were dead links. Every target in README.md must
 * therefore be an absolute https:// URL or an in-page #anchor.
 *
 * `raw.githubusercontent.com/.../main/...` URLs are rejected as well: they
 * follow the branch, not the published version, and are not a stable image host.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const readme = readFileSync(join(root, 'README.md'), 'utf8');

/** Image hosts allowed in README.md: the GitHub Pages site and the badge service. */
const IMAGE_HOSTS = new Set(['strapi-community.github.io', 'img.shields.io']);

/**
 * Removes fenced and inline code, whose contents are not rendered as links.
 *
 * @param {string} text - Markdown source.
 * @returns {string} Markdown without code.
 */
function stripCode(text) {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '').replace(/`[^`\n]*`/g, '');
}

/**
 * Collects every link and image in a Markdown document.
 *
 * Covers inline Markdown links and images, reference definitions, autolinks
 * and HTML `src`/`href` attributes.
 *
 * @param {string} markdown - Markdown source.
 * @returns {{ kind: 'image' | 'link', url: string, alt?: string, source: string }[]} Targets in document order.
 */
export function collectTargets(markdown) {
  const text = stripCode(markdown);
  const targets = [];
  for (const m of text.matchAll(/(!?)\[((?:[^\][]|\[[^\]]*\])*)\]\(\s*<?([^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/g)) {
    targets.push(
      m[1] ? { kind: 'image', url: m[3], alt: m[2].trim(), source: m[0] } : { kind: 'link', url: m[3], source: m[0] }
    );
  }
  for (const m of text.matchAll(/^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/gm)) {
    targets.push({ kind: 'link', url: m[1], source: m[0].trim() });
  }
  for (const m of text.matchAll(/<(https?:\/\/[^>\s]+)>/g)) {
    targets.push({ kind: 'link', url: m[1], source: m[0] });
  }
  for (const m of text.matchAll(/<img\b[^>]*>/gi)) {
    const src = /\bsrc\s*=\s*["']([^"']*)["']/i.exec(m[0]);
    const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(m[0]);
    targets.push({ kind: 'image', url: src ? src[1] : '', alt: alt ? alt[1].trim() : '', source: m[0] });
  }
  for (const m of text.matchAll(/<(?!img\b)[a-z][^>]*\b(?:href|src)\s*=\s*["']([^"']*)["'][^>]*>/gi)) {
    targets.push({ kind: 'link', url: m[1], source: m[0] });
  }
  return targets;
}

/**
 * @param {string} url - Link or image target.
 * @returns {boolean} Whether the target resolves the same on GitHub, npm and the Strapi marketplace.
 */
const isPortable = (url) => /^https:\/\/[^/\s]+/.test(url) || /^#[\w-]+$/.test(url);

const targets = collectTargets(readme);

test('README.md has links and images to check', () => {
  assert.ok(targets.filter((t) => t.kind === 'image').length >= 4, 'expected the README screenshots');
  assert.ok(targets.filter((t) => t.kind === 'link').length >= 4, 'expected README links');
});

test('every README link and image is an absolute https:// URL or an #anchor', () => {
  const bad = targets.filter((t) => !isPortable(t.url)).map((t) => t.source);
  assert.deepEqual(bad, [], 'relative or non-https targets break on npm and the Strapi marketplace');
});

test('every README image has alt text', () => {
  const missing = targets.filter((t) => t.kind === 'image' && !t.alt).map((t) => t.source);
  assert.deepEqual(missing, []);
});

test('README images come from GitHub Pages or the badge service', () => {
  const foreign = targets
    .filter((t) => t.kind === 'image' && isPortable(t.url) && !t.url.startsWith('#'))
    .filter((t) => !IMAGE_HOSTS.has(new URL(t.url).hostname))
    .map((t) => t.source);
  assert.deepEqual(foreign, []);
});

test('README images on GitHub Pages are files in docs/public', () => {
  const prefix = 'https://strapi-community.github.io/plugin-io/';
  const missing = targets
    .filter((t) => t.kind === 'image' && t.url.startsWith(prefix))
    .filter((t) => !existsSync(join(root, 'docs', 'public', decodeURIComponent(t.url.slice(prefix.length)))))
    .map((t) => t.source);
  assert.deepEqual(missing, [], 'the Pages site serves docs/public; a removed file breaks the README image');
});

test('README does not use raw.githubusercontent.com branch URLs', () => {
  const raw = targets.filter((t) => /raw\.githubusercontent\.com\//.test(t.url)).map((t) => t.source);
  assert.deepEqual(raw, []);
});

test('in-page README anchors point at existing headings', () => {
  const slugs = new Set(
    stripCode(readme)
      .split('\n')
      .filter((line) => /^#{1,6}\s/.test(line))
      .map((line) =>
        line
          .replace(/^#{1,6}\s+/, '')
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s_-]/gu, '')
          .replace(/\s/g, '-')
      )
  );
  const dangling = targets.filter((t) => t.url.startsWith('#') && !slugs.has(t.url.slice(1))).map((t) => t.source);
  assert.deepEqual(dangling, []);
});

test('the collector finds relative targets (self-check)', () => {
  const sample = [
    '![Shot](./pics/a.png)',
    '<img src="./pics/b.png" alt="B">',
    '[License](./LICENSE)',
    '[ok](https://example.com) [top](#top)',
    '`[code](./ignored)`',
  ].join('\n');
  const bad = collectTargets(sample)
    .filter((t) => !isPortable(t.url))
    .map((t) => t.url);
  assert.deepEqual(bad, ['./pics/a.png', './LICENSE', './pics/b.png']);
});
