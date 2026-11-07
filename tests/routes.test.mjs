import assert from 'node:assert/strict';
import test from 'node:test';
import routes from '../server/src/routes/index.js';
import { ACTIONS } from '../server/src/bootstrap/permissions.js';

test('only admin routes exist (the scaffold /api/io route is gone)', () => {
  assert.deepEqual(Object.keys(routes), ['admin']);
});

test('every admin route except the presence session requires a plugin permission', () => {
  const registered = new Set(ACTIONS.map((a) => `plugin::io.${a.uid}`));
  for (const route of routes.admin.routes) {
    const policies = route.config.policies;
    assert.ok(policies.includes('admin::isAuthenticatedAdmin'), route.path);
    if (route.path === '/presence/session') continue;
    const rbac = policies.find((p) => p?.name === 'admin::hasPermissions');
    assert.ok(rbac, `${route.method} ${route.path} has hasPermissions`);
    for (const action of rbac.config.actions) assert.ok(registered.has(action), action);
  }
});

test('mutating monitoring routes need the manage permission', () => {
  const manage = routes.admin.routes.filter((r) => ['/test-event', '/reset-stats'].includes(r.path));
  for (const route of manage) {
    assert.deepEqual(route.config.policies[1].config.actions, ['plugin::io.monitoring.manage']);
  }
});
