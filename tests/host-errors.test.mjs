/**
 * The admin controllers must throw errors from the same `@strapi/utils` copy
 * that Strapi's error middleware (in `@strapi/core`) checks with `instanceof`.
 *
 * npm satisfies the plugin's `@strapi/utils` peer with the newest 5.x at the
 * app root. On a host older than that (for example Strapi 5.38 while 5.62 is
 * current), Strapi's packages pin their exact version and get nested copies,
 * so a ValidationError from the root copy is not an ApplicationError for
 * Strapi and the request failed with 500 instead of 400. The CI job on the
 * 5.38.0 peer floor found this.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { errors as rootErrors } from '@strapi/utils';
import { getHostErrors, resolveHostErrors } from '../server/src/utils/host-errors.js';
import { createStrapi } from './helpers/strapi-stub.mjs';

/**
 * Writes a minimal CommonJS package.
 *
 * @param {string} dir - Package directory.
 * @param {string} name - Package name.
 * @param {string} source - index.js source.
 */
function writePackage(dir, name, source) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version: '5.38.0', main: 'index.js' }));
  writeFileSync(join(dir, 'index.js'), source);
}

/**
 * Builds an app tree like npm's on an old host: the root @strapi/utils is a
 * different copy from the one nested below @strapi/core.
 *
 * @returns {string} App root.
 */
function createOldHostApp() {
  const app = mkdtempSync(join(tmpdir(), 'io-host-errors-'));
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'app', private: true }));
  const modules = join(app, 'node_modules', '@strapi');
  writePackage(join(modules, 'strapi'), '@strapi/strapi', "module.exports = require('@strapi/core');");
  writePackage(join(modules, 'core'), '@strapi/core', "module.exports = { utils: require('@strapi/utils') };");
  const errorsSource = [
    'class ApplicationError extends Error { constructor(m, d) { super(m); this.name = "ApplicationError"; this.details = d; } }',
    'class ValidationError extends ApplicationError { constructor(m, d) { super(m, d); this.name = "ValidationError"; } }',
    'module.exports = { errors: { ApplicationError, ValidationError }, copy: "core-nested" };',
  ].join('\n');
  writePackage(join(modules, 'core', 'node_modules', '@strapi', 'utils'), '@strapi/utils', errorsSource);
  writePackage(join(modules, 'utils'), '@strapi/utils', 'module.exports = { errors: {}, copy: "root" };');
  return app;
}

test('resolveHostErrors loads the @strapi/utils copy that @strapi/core uses', () => {
  const app = createOldHostApp();
  try {
    const hostErrors = resolveHostErrors(app);
    assert.notEqual(hostErrors, rootErrors);
    const error = new hostErrors.ValidationError('Invalid settings', { errors: [] });
    assert.ok(error instanceof hostErrors.ApplicationError);
    assert.ok(!(error instanceof rootErrors.ApplicationError), 'a different class than the plugin import');
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});

test('resolveHostErrors falls back to the plugin import without a resolvable Strapi', () => {
  const app = mkdtempSync(join(tmpdir(), 'io-host-errors-empty-'));
  try {
    assert.equal(resolveHostErrors(app), rootErrors);
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});

test('in this repository the host copy is the deduped root copy', () => {
  assert.equal(resolveHostErrors(process.cwd()), rootErrors);
});

test('the settings controller throws the ValidationError class of the host @strapi/core', async () => {
  const app = createOldHostApp();
  try {
    const strapi = createStrapi();
    strapi.dirs = { app: { root: app } };
    const hostErrors = getHostErrors(strapi);
    const controller = strapi.plugin('io').controller('settings');
    const ctx = { request: { body: { cors: { origins: ['nope'] } } } };
    await assert.rejects(controller.updateSettings(ctx), (error) => {
      assert.ok(error instanceof hostErrors.ValidationError, 'Strapi answers it with 400');
      assert.ok(error instanceof hostErrors.ApplicationError);
      assert.ok(error.details.errors.length > 0);
      return true;
    });
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});

test('the monitoring test-event endpoint throws the ValidationError class of the host @strapi/core', async () => {
  const app = createOldHostApp();
  try {
    const strapi = createStrapi();
    strapi.dirs = { app: { root: app } };
    const hostErrors = getHostErrors(strapi);
    const controller = strapi.plugin('io').controller('monitoring');
    const ctx = { request: { body: { eventName: '' } } };
    await assert.rejects(controller.sendTestEvent(ctx), hostErrors.ValidationError);
  } finally {
    rmSync(app, { recursive: true, force: true });
  }
});
