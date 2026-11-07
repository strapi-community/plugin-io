import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { generateNotes, prepare, splitUnreleased, stripCoAuthorTrailers } from '../scripts/release-unreleased.mjs';

const SAMPLE = `## [Unreleased]

### Migration

* Do the thing.

# [5.8.0](https://example.test) (2026-04-16)

* old
`;

test('the release plugin moves [Unreleased] into the notes and out of CHANGELOG.md (IO-RA-10)', async () => {
  assert.deepEqual(splitUnreleased(SAMPLE), {
    body: '### Migration\n\n* Do the thing.',
    rest: '# [5.8.0](https://example.test) (2026-04-16)\n\n* old\n',
  });
  const cwd = await mkdtemp(join(tmpdir(), 'io-release-'));
  await writeFile(join(cwd, 'CHANGELOG.md'), SAMPLE);
  assert.equal(await generateNotes({}, { cwd }), '### Migration\n\n* Do the thing.');
  await prepare({}, { cwd, logger: { log() {} } });
  const after = await readFile(join(cwd, 'CHANGELOG.md'), 'utf8');
  assert.ok(!after.includes('[Unreleased]'));
  assert.ok(after.startsWith('# [5.8.0]'));
  await rm(cwd, { recursive: true });
});

test('the release plugin is wired before @semantic-release/changelog and the repo CHANGELOG has at most one [Unreleased]', async () => {
  const config = JSON.parse(await readFile(new URL('../.releaserc.json', import.meta.url), 'utf8'));
  const names = config.plugins.map((p) => (Array.isArray(p) ? p[0] : p));
  assert.ok(names.indexOf('./scripts/release-unreleased.mjs') < names.indexOf('@semantic-release/changelog'));
  assert.ok(
    names.indexOf('./scripts/release-unreleased.mjs') > names.indexOf('@semantic-release/release-notes-generator')
  );
  const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  // Right after a release the section is folded away; otherwise there is one, on top.
  const count = (changelog.match(/^## \[Unreleased\]/gm) || []).length;
  assert.ok(count <= 1);
  if (count === 1) assert.ok(changelog.indexOf('## [Unreleased]') < changelog.search(/^#{1,2} \[\d/m));
});

test('release notes and CHANGELOG carry no co-author trailers', async () => {
  const notes =
    '### BREAKING CHANGES\n\n* old rooms are gone.\n\nCo-Authored-By: Someone <a@example.test>\n\n* other\nco-authored-by: x <y@example.test>\n';
  assert.equal(stripCoAuthorTrailers(notes), '### BREAKING CHANGES\n\n* old rooms are gone.\n\n* other\n');
  const cwd = await mkdtemp(join(tmpdir(), 'io-release-'));
  await writeFile(join(cwd, 'CHANGELOG.md'), '# [1.0.0](x) (2026-01-01)\n');
  const nextRelease = { notes };
  await prepare({}, { cwd, logger: { log() {} }, nextRelease });
  assert.doesNotMatch(nextRelease.notes, /co-authored-by/i);
  await rm(cwd, { recursive: true, force: true });
  const changelog = await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
  assert.doesNotMatch(changelog, /co-authored-by/i);
});
