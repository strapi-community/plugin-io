import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const dir = fileURLToPath(new URL('../.github/workflows/', import.meta.url));
const workflows = readdirSync(dir)
  .filter((f) => f.endsWith('.yml'))
  .map((f) => [f, readFileSync(dir + f, 'utf8')]);
const script = fileURLToPath(new URL('../scripts/e2e-app.mjs', import.meta.url));

test('every action is pinned to a full commit SHA', () => {
  for (const [file, text] of workflows) {
    for (const [, ref] of text.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)) {
      assert.match(ref, /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/, `${file}: ${ref}`);
    }
  }
});

test('CI is read-only and runs the e2e suites against a scaffolded Strapi app on Node 22 and 24', () => {
  const ci = workflows.find(([f]) => f === 'ci.yml')[1];
  assert.match(ci, /^permissions:\n {2}contents: read$/m);
  assert.doesNotMatch(ci, /pull_request_target/);
  const e2e = ci.slice(ci.indexOf('\n  e2e:'));
  assert.match(e2e, /node: \['22', '24'\]/);
  assert.match(e2e, /npx playwright install --with-deps chromium/);
  assert.match(e2e, /node scripts\/e2e-app\.mjs/);
  assert.match(e2e, /persist-credentials: false/);
});

test('the e2e runner refuses reserved ports and app folders inside the repository', () => {
  const port = spawnSync(process.execPath, [script, '--port', '1337'], { encoding: 'utf8' });
  assert.equal(port.status, 2);
  const inside = spawnSync(process.execPath, [script, '--dir', 'tests/e2e/app'], { encoding: 'utf8' });
  assert.equal(inside.status, 2);
});
