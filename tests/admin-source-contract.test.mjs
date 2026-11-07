import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('../admin/src/', import.meta.url));
const walk = (d) =>
  readdirSync(d).flatMap((e) => {
    const p = join(d, e);
    return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(e) ? [p] : [];
  });
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
const sources = walk(root).map((f) => [relative(root, f), strip(readFileSync(f, 'utf8'))]);
const offenders = (re) => sources.filter(([, s]) => re.test(s)).map(([f]) => f);

test('no window.confirm / alert', () => assert.deepEqual(offenders(/\bwindow\.(confirm|alert)\s*\(/), []));
test('no emoji', () => assert.deepEqual(offenders(/(?![©®™])\p{Extended_Pictographic}/u), []));
test('no var(--colors-', () => assert.deepEqual(offenders(/var\(--colors-/), []));
test('no colour literals', () =>
  assert.deepEqual(offenders(/(?<=['"`:\s(,])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\brgba?\s*\(/), []));
test('no px or rem font sizes', () =>
  assert.deepEqual(offenders(/font-?size\s*[:=]\s*[{'"`]*\s*\d+(?:\.\d+)?(px|rem)/i), []));
test('no custom media widths', () => assert.deepEqual(offenders(/@media[^{`]*\(\s*(?:max|min)-width/), []));
test('no inline style objects (DS props and tokens only)', () => assert.deepEqual(offenders(/\bstyle=\{\{/), []));
test('no styled-components skins: every element comes from the Design System', () =>
  assert.deepEqual(offenders(/from 'styled-components'/), []));
test('no console.log/info/warn', () => assert.deepEqual(offenders(/console\.(log|info|warn|debug)\s*\(/), []));
test('no deprecated settings API and no DS v1 `as` prop', () => {
  assert.deepEqual(offenders(/createSettingSection|addSettingsLinks\(/), []);
  assert.deepEqual(offenders(/<[A-Z]\w*[^>]*\sas=\{/), []);
});
test('Toggle is not used for settings (Switch is)', () => assert.deepEqual(offenders(/\bToggle\b/), []));
test('no admin JWT is sent to the users-permissions strategy', () =>
  assert.deepEqual(offenders(/strategy:\s*'jwt'/), []));
test('no raw /admin hrefs (router links keep custom admin paths working)', () =>
  assert.deepEqual(offenders(/href=["'`]\/admin/), []));
test('no unreferenced admin modules', () => {
  const all = sources.map(([f]) => f.replace(/\.(jsx?|mjs)$/, ''));
  const text = sources.map(([, s]) => s).join('\n');
  const unused = all.filter((f) => {
    if (f === 'index') return false;
    const parts = f.split('/');
    const base = parts.at(-1) === 'index' ? parts.at(-2) : parts.at(-1);
    return !new RegExp(`['"/]${base}(\\.mjs|\\.jsx?)?['"]`).test(text) && !f.startsWith('translations');
  });
  assert.deepEqual(unused, []);
});
