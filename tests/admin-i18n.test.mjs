import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';

const LOCALES = ['en', 'de', 'fr', 'es', 'pt'];
const dir = fileURLToPath(new URL('../admin/src/', import.meta.url));
const cat = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(join(dir, 'translations', `${l}.json`), 'utf8'))])
);
const walk = (d) =>
  readdirSync(d).flatMap((e) => {
    const p = join(d, e);
    return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(e) ? [p] : [];
  });
const code = walk(dir)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const str = `'((?:[^'\\\\]|\\\\.)*)'`;
const used = new Map();
for (const re of [
  new RegExp(`\\bt\\(\\s*'([^']+)'\\s*,\\s*${str}`, 'g'),
  new RegExp(`getTranslation\\(\\s*'([^']+)'\\s*\\)\\s*,\\s*defaultMessage:\\s*${str}`, 'g'),
  new RegExp('id:\\s*`\\$\\{PLUGIN_ID\\}\\.([^`]+)`\\s*,\\s*defaultMessage:\\s*' + str, 'g'),
]) {
  for (const m of code.matchAll(re)) used.set(m[1], m[2].replace(/\\'/g, "'"));
}
const args = (msg, out = new Set()) => {
  for (const el of Array.isArray(msg) ? msg : parse(msg)) {
    if ([TYPE.argument, TYPE.number, TYPE.date, TYPE.time, TYPE.select, TYPE.plural, TYPE.tag].includes(el.type)) {
      out.add(el.value);
    }
    for (const o of Object.values(el.options ?? {})) args(o.value, out);
    if (el.children) args(el.children, out);
  }
  return [...out].sort().join(',');
};

test('no template-literal translation ids', () => {
  assert.equal([...code.matchAll(/getTranslation\(\s*`/g)].length, 0);
  assert.equal([...code.matchAll(/\bt\(\s*`/g)].length, 0);
});
test('every used id exists in every locale', () => {
  for (const l of LOCALES)
    assert.deepEqual(
      [...used.keys()].filter((id) => !(id in cat[l])),
      [],
      l
    );
});
test('all locales have the same keys and no orphans', () => {
  const keys = Object.keys(cat.en).sort();
  for (const l of LOCALES) assert.deepEqual(Object.keys(cat[l]).sort(), keys, l);
  assert.deepEqual(
    keys.filter((k) => !used.has(k)),
    []
  );
});
test('defaultMessage equals en.json', () => {
  assert.deepEqual(
    [...used].filter(([id, d]) => cat.en[id] !== d).map(([id]) => id),
    []
  );
});
test('valid ICU with identical placeholders', () => {
  for (const l of LOCALES) {
    for (const [id, m] of Object.entries(cat[l])) assert.equal(args(m), args(cat.en[id]), `${l} ${id}`);
  }
});
test('German uses Sie (no du forms)', () => {
  const du = /\b(du|dich|dir|dein\w*|euch|euer\w*)\b|\b(Klicke|Wähle|Füge|Erstelle|Konfiguriere|Gib)\b(?! Sie)/;
  assert.deepEqual(
    Object.entries(cat.de)
      .filter(([, m]) => du.test(m))
      .map(([k]) => k),
    []
  );
});
test('no exclamation marks or "successfully" in messages', () => {
  for (const l of LOCALES) {
    assert.deepEqual(
      Object.entries(cat[l])
        .filter(([, m]) => /!|successfully/i.test(m))
        .map(([k]) => k),
      [],
      l
    );
  }
});
