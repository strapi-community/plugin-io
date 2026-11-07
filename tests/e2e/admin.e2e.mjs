/**
 * Browser regression tests for the plugin's admin screens, run against a real
 * Strapi 5 app that has the plugin installed.
 *
 *   IO_E2E_URL=http://127.0.0.1:1337 IO_E2E_EMAIL=... IO_E2E_PASSWORD=... npm run test:e2e
 *
 * Optional: IO_E2E_VIEWER_EMAIL / IO_E2E_VIEWER_PASSWORD for an admin whose
 * role has only "Read settings" and "Read monitoring".
 *
 * The suite only changes one setting (Require authentication) and restores it.
 * Requests to other hosts are blocked. Without IO_E2E_URL every test is skipped.
 *
 * @see https://playwright.dev/docs/api/class-page
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

const BASE = process.env.IO_E2E_URL?.replace(/\/$/, '');
const ADMIN = { email: process.env.IO_E2E_EMAIL, password: process.env.IO_E2E_PASSWORD };
const VIEWER = { email: process.env.IO_E2E_VIEWER_EMAIL, password: process.env.IO_E2E_VIEWER_PASSWORD };
const skip = !BASE || !ADMIN.email || !ADMIN.password ? 'set IO_E2E_URL, IO_E2E_EMAIL and IO_E2E_PASSWORD' : false;
const host = BASE ? new URL(BASE).hostname : '';

let browser;
before(async () => {
  if (!skip) browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
});

/**
 * Opens a logged-in admin page.
 *
 * @param {{ email: string, password: string }} who - Admin credentials.
 * @param {{ width?: number, height?: number, theme?: 'light' | 'dark' }} [options] - Viewport and theme.
 * @returns {Promise<{ page: import('playwright').Page, errors: string[], close: () => Promise<void> }>} Page.
 */
async function open(who, { width = 1440, height = 900, theme = 'light' } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.route(
    (url) => url.hostname !== host,
    (route) => route.abort()
  );
  await context.addInitScript((t) => localStorage.setItem('STRAPI_THEME', t), theme);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${BASE}/admin/auth/login`);
  await page.fill('input[name="email"]', who.email);
  await page.fill('input[name="password"]', who.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/auth/'));
  return { page, errors, close: () => context.close() };
}

/** Reads a Node readable stream into a string. */
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

/** Layout problems a native Strapi page does not have. */
const layout = (page) =>
  page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const overflowX = document.documentElement.scrollWidth - window.innerWidth;
    const clipped = [...main.querySelectorAll('button, a, input, h1, h2, p, td, th')]
      .filter((el) => el.offsetParent !== null)
      // Content inside a horizontally scrolling container (DS tables on small screens) is not clipped.
      .filter((el) => {
        for (let p = el.parentElement; p && p !== main; p = p.parentElement) {
          if (['auto', 'scroll'].includes(getComputedStyle(p).overflowX)) return false;
        }
        return true;
      })
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
      })
      .map((el) => el.tagName + ':' + (el.textContent || '').trim().slice(0, 30));
    return { overflowX, clipped };
  });

test('Settings: Save stays disabled until a valid change, guards navigation and saves', { skip }, async () => {
  const { page, errors, close } = await open(ADMIN);
  await page.goto(`${BASE}/admin/settings/io/settings`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  const save = page.getByRole('button', { name: 'Save' });
  assert.equal(await save.isDisabled(), true, 'Save disabled while clean');

  const ping = page.getByRole('textbox', { name: /Ping timeout/ });
  const pingBefore = await ping.inputValue();
  await ping.fill('10');
  await page
    .getByText(/Enter a whole number from 1,?000 to 600,?000\./)
    .first()
    .waitFor();
  assert.equal(await save.isDisabled(), true, 'invalid value keeps Save disabled');
  await ping.fill(pingBefore);

  // Booleans are native Strapi boolean inputs: a DS Toggle, i.e. a labelled checkbox input.
  const toggle = page.getByRole('checkbox', { name: 'Require authentication' });
  const original = await toggle.isChecked();
  await toggle.click();
  assert.equal(await save.isDisabled(), false, 'a change enables Save');

  await page.getByRole('link', { name: 'Webhooks' }).first().click();
  await page.getByRole('alertdialog').waitFor();
  // Radix moves focus into the dialog once it has mounted its Escape handler.
  await page.waitForFunction(() => document.activeElement?.closest('[role="alertdialog"]'));
  await page.keyboard.press('Escape');
  await page.getByRole('alertdialog').waitFor({ state: 'hidden', timeout: 5000 });
  assert.match(page.url(), /\/settings\/io\/settings$/, 'Escape keeps the page and the edits');

  const puts = [];
  page.on('request', (r) => r.method() === 'PUT' && r.url().endsWith('/io/settings') && puts.push(r));
  await save.click();
  await page.getByText('Settings saved.').first().waitFor();
  assert.equal(puts.length, 1);
  assert.equal(await save.isDisabled(), true, 'clean again after saving');

  // restore
  await toggle.click();
  await save.click();
  await page.getByText('Settings saved.').first().waitFor();
  assert.equal(await toggle.isChecked(), original);
  assert.deepEqual(errors, []);
  await close();
});

test(
  'Settings: export downloads JSON; import previews changes and fills the form without saving',
  { skip },
  async () => {
    const { page, errors, close } = await open(ADMIN);
    await page.goto(`${BASE}/admin/settings/io/settings`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export settings' }).click(),
    ]);
    assert.match(download.suggestedFilename(), /^socket-io-settings-\d{4}-\d{2}-\d{2}\.json$/);
    const exported = JSON.parse(await streamToString(await download.createReadStream()));
    assert.equal(typeof exported.presence.enabled, 'boolean');
    assert.equal(JSON.stringify(exported).match(/token|password|secret/i), null, 'no secrets in the export');

    const imported = { ...exported, presence: { ...exported.presence, enabled: !exported.presence.enabled } };
    const puts = [];
    page.on('request', (r) => r.method() === 'PUT' && r.url().endsWith('/io/settings') && puts.push(r));
    await page.locator('input[type="file"]').setInputFiles({
      name: 'settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(imported)),
    });
    const dialog = page.getByRole('alertdialog');
    await dialog.getByText('presence.enabled').waitFor();
    await dialog.getByRole('button', { name: 'Replace values' }).click();
    await page.getByText('Imported values are in the form. Save to apply them.').first().waitFor();
    assert.equal(
      await page.getByRole('checkbox', { name: 'Show who is editing' }).isChecked(),
      !exported.presence.enabled
    );
    assert.equal(await page.getByRole('button', { name: 'Save' }).isDisabled(), false, 'imported values are unsaved');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ presence: { enabled: 'yes', showTypingIndicator: true } })),
    });
    await page
      .getByText(/The file has invalid values: presence\.enabled/)
      .first()
      .waitFor();

    await page.getByRole('button', { name: 'Discard changes' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard changes' }).click();
    await page.getByRole('alertdialog').waitFor({ state: 'hidden' });
    assert.equal(puts.length, 0, 'import alone never saves');
    assert.deepEqual(errors, []);
    await close();
  }
);

test('Settings: a setting title is the label of its toggle; Space toggles it', { skip }, async () => {
  const { page, errors, close } = await open(ADMIN);
  await page.goto(`${BASE}/admin/settings/io/settings`, { waitUntil: 'networkidle' });
  const toggle = page.getByRole('checkbox', { name: 'Allow entry subscriptions' });
  const before = await toggle.isChecked();
  await page.locator('label', { hasText: 'Allow entry subscriptions' }).click();
  assert.equal(await toggle.isChecked(), !before, 'clicking the title toggles the input');
  const limit = page.getByRole('textbox', { name: /Subscriptions per client/ });
  assert.equal(await limit.isDisabled(), before, 'limit follows the toggle');
  await toggle.focus();
  await page.keyboard.press('Space');
  assert.equal(await toggle.isChecked(), before, 'Space toggles it back');
  assert.equal(await page.getByRole('button', { name: 'Save' }).isDisabled(), true, 'back to the saved state');
  assert.deepEqual(errors, []);
  await close();
});

test(
  'Settings: a save after another admin saved shows the conflict dialog (two browser contexts)',
  { skip },
  async () => {
    const a = await open(ADMIN);
    const b = await open(ADMIN);
    for (const { page } of [a, b]) {
      await page.goto(`${BASE}/admin/settings/io/settings`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { level: 1 }).first().waitFor();
    }
    const auth = (page) => page.getByRole('checkbox', { name: 'Require authentication' });
    const save = (page) => page.getByRole('button', { name: 'Save' });
    const original = await auth(a.page).isChecked();

    // A saves first.
    await auth(a.page).click();
    await save(a.page).click();
    await a.page.getByText('Settings saved.').first().waitFor();

    // B still has the old revision: its save is refused with 409 and nothing is stored.
    const statuses = [];
    b.page.on('response', (r) => {
      if (r.request().method() === 'PUT' && r.url().endsWith('/io/settings')) statuses.push(r.status());
    });
    const subs = b.page.getByRole('checkbox', { name: 'Allow entry subscriptions' });
    const subsBefore = await subs.isChecked();
    await subs.click();
    await save(b.page).click();
    const dialog = b.page.getByRole('alertdialog', { name: 'Settings changed in the meantime' });
    await dialog.waitFor();
    assert.deepEqual(statuses, [409]);

    // "Keep editing" closes the dialog and keeps the draft; saving again shows it again.
    await dialog.getByRole('button', { name: 'Keep editing' }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await subs.isChecked(), !subsBefore, 'draft kept');
    assert.equal(await save(b.page).isDisabled(), false, 'still unsaved');
    await save(b.page).click();
    await dialog.waitFor();
    assert.deepEqual(statuses, [409, 409]);

    // "Load latest settings" replaces the form with the values A stored.
    await dialog.getByRole('button', { name: 'Load latest settings' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await b.page.waitForFunction(
      (want) =>
        [...document.querySelectorAll('main input[type="checkbox"]')].find(
          (el) => el.labels?.[0]?.textContent.trim() === 'Require authentication'
        )?.checked === want,
      !original
    );
    assert.equal(await subs.isChecked(), subsBefore, 'the refused draft is gone');
    assert.equal(await save(b.page).isDisabled(), true, 'clean after loading');

    // restore through B, which now has the current revision
    await auth(b.page).click();
    await save(b.page).click();
    await b.page.getByText('Settings saved.').first().waitFor();
    assert.equal(await auth(b.page).isChecked(), original);
    assert.deepEqual([...a.errors, ...b.errors], []);
    await a.close();
    await b.close();
  }
);

test('Monitoring: native page anatomy, four counters and the admins table', { skip }, async () => {
  const { page, errors, close } = await open(ADMIN);
  await page.goto(`${BASE}/admin/settings/io/monitoring`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1, name: 'Monitoring' }).waitFor();
  for (const label of ['Connected clients', 'Active rooms', 'Events per second', 'Events sent']) {
    assert.ok(await page.getByText(label, { exact: true }).first().isVisible(), label);
  }
  assert.ok(await page.getByRole('button', { name: 'Refresh' }).isVisible());
  assert.ok(await page.getByRole('heading', { name: 'Admins online' }).isVisible());
  const { overflowX, clipped } = await layout(page);
  assert.ok(overflowX <= 0, `no horizontal overflow (${overflowX}px)`);
  assert.deepEqual(clipped, []);
  assert.deepEqual(errors, []);
  await close();
});

for (const [name, path] of [
  ['Settings', '/admin/settings/io/settings'],
  ['Monitoring', '/admin/settings/io/monitoring'],
]) {
  test(`${name}: fits 390 px and dark mode without overflow`, { skip }, async () => {
    for (const options of [{ width: 390, height: 844 }, { theme: 'dark' }]) {
      const { page, errors, close } = await open(ADMIN, options);
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { level: 1 }).first().waitFor();
      const { overflowX, clipped } = await layout(page);
      assert.ok(overflowX <= 0, `${JSON.stringify(options)}: horizontal overflow ${overflowX}px`);
      assert.deepEqual(clipped, [], JSON.stringify(options));
      assert.deepEqual(errors, []);
      await close();
    }
  });
}

test('Homepage: both widgets render through the Widget API', { skip }, async () => {
  const { page, errors, close } = await open(ADMIN);
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.getByText('Admins online', { exact: true }).first().waitFor();
  assert.ok(await page.getByText('Socket.IO', { exact: true }).first().isVisible());
  assert.deepEqual(errors, []);
  await close();
});

test(
  'RBAC: a read-only admin gets a read-only Settings form and Monitoring without manage actions',
  {
    skip: skip || (!VIEWER.email ? 'set IO_E2E_VIEWER_EMAIL and IO_E2E_VIEWER_PASSWORD' : false),
  },
  async () => {
    const { page, errors, close } = await open(VIEWER);
    await page.goto(`${BASE}/admin/settings/io/settings`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    // Like Strapi's own settings pages for read-only roles: the form is shown, Save stays disabled.
    assert.equal(
      await page.getByRole('button', { name: 'Save' }).isDisabled(),
      true,
      'Save disabled without settings.update'
    );
    assert.equal(
      await page.getByRole('checkbox', { name: 'Require authentication' }).isDisabled(),
      true,
      'fields read-only'
    );
    await page.goto(`${BASE}/admin/settings/io/monitoring`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1, name: 'Monitoring' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Reset statistics' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Send test event' }).count(), 0);
    assert.deepEqual(errors, []);
    await close();
  }
);
