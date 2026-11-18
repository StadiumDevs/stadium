import { test, expect } from '@playwright/test';

// Canonical wallet-gated client journey, driven by the //Alice test wallet
// (signs for real) against the mock-mode harness. The stadium-tester runs this
// verbatim — it is NOT a per-run scratch spec. Keep it current as the UI moves.
//
// Launch the target first:
//   cd client && npm run dev:harness     # mock + test wallet + Alice whitelisted
// Then run:
//   VITE_USE_TEST_WALLET=true node .claude/skills/stadium-tester/scripts/run-playwright.mjs \
//     --target http://localhost:8080 \
//     --spec .claude/skills/stadium-tester/flows/client-journey.spec.mjs
//
// Mock mode fails closed (#303): any API call without a mock branch throws
// MockNotImplementedError instead of reaching a server, so there is no
// console-error filter here. A network or mock error fails the journey.

const consoleErrors = [];
// Any request to an API host means mock mode leaked to a real server.
const API_HOST = /localhost:2000|\.up\.railway\.app|stadium\.joinwebzero\.com\/api/i;
const apiRequests = [];
const MOCK_KEYS = [
  'stadium_mock_scores_v1',
  'stadium_mock_ballot_v1',
  'stadium_mock_promoted_v1',
  'stadium_mock_paid_v1',
  'stadium_mock_admin_tiers_v1',
  'stadium_mock_audit_log_v1',
  'projects',
];

test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`${page.url()} :: ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`${page.url()} :: ${err.message}`));
  page.on('request', (req) => {
    if (API_HOST.test(req.url())) apiRequests.push(`${req.method()} ${req.url()}`);
  });
  // Deterministic mock state per test: reset once, before the app boots.
  await page.goto('/');
  await page.evaluate((keys) => {
    for (const k of keys) localStorage.removeItem(k);
    sessionStorage.clear();
  }, MOCK_KEYS);
});

async function connectAdmin(page) {
  await page.goto('/admin');
  await page.getByRole('button', { name: /CONNECT ADMIN WALLET/i }).click();
  await expect(page.getByText('·ADMIN / DASHBOARD')).toBeVisible({ timeout: 15000 });
}

// Admin sub-pages re-check the wallet after a full navigation.
async function signInOnPage(page) {
  const button = page.getByRole('button', { name: /CONNECT ADMIN WALLET|SIGN IN AGAIN/i });
  await button.first().waitFor({ timeout: 15000 }).catch(() => {});
  if (await button.count()) await button.first().click();
}

test('preview-mode + test-wallet sanity', async ({ page }) => {
  const env = await page.evaluate(() => ({
    mock: window.__STADIUM_MOCK__,
    wallet: window.__TEST_WALLET_ENABLED__,
  }));
  test.info().annotations.push({ type: 'mock', description: String(env.mock) });
  expect(env.mock).toBe(true);
  expect(env.wallet).toBe(true);
});

test('wallet sign-in unlocks the admin dashboard', async ({ page }) => {
  await connectAdmin(page);
  await expect(page.getByRole('button', { name: 'LOGOUT' })).toBeVisible();
});

test('confirm payment records an M1 payment from fixtures', async ({ page }) => {
  await connectAdmin(page);
  await page.getByRole('button', { name: /APPROVE & PROCESS M2 PAYMENT/i }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('CONFIRM PAYMENT', { exact: false }).first()).toBeVisible();

  // The fixture project has no M1 payment yet, so M2 is locked: pay M1.
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: /M1 - Initial Payment/i }).click();
  // Fixture team members all carry the same redacted placeholder wallet, and
  // the modal keys recipient amounts by wallet, so the rows share one amount.
  // Set it equal to the total so the sum check passes. (Both modal quirks are
  // in docs/improvement-backlog.md.)
  await dialog.locator('#totalAmount').fill('300');
  await dialog.locator('table input[type="number"]').first().fill('300');
  await dialog.getByRole('button', { name: /CONFIRM PAYMENT ▸/ }).click();

  await expect(page.getByText('Payment Confirmed', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(dialog).toHaveCount(0);
});

test('admin tiers: add and remove a global admin (mocked)', async ({ page }) => {
  await connectAdmin(page);
  await page.goto('/admin/app-admins');
  await signInOnPage(page);
  await expect(page.getByText('·APP ADMINS')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/SEEDED FROM VITE_ADMIN_ADDRESSES/i)).toBeVisible();

  const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
  const global = page.locator('section').filter({ hasText: '·GLOBAL ADMINS' });
  await global.getByPlaceholder('Wallet address').fill(BOB);
  await global.getByRole('button', { name: /ADD GLOBAL ADMINS/i }).click();
  await expect(global.getByText(BOB)).toBeVisible({ timeout: 10000 });

  page.once('dialog', (d) => d.accept()); // native "Remove …?" confirm
  await global.getByRole('button', { name: `Remove ${BOB}` }).click();
  await expect(global.getByText(/NO GLOBAL ADMINS YET/i)).toBeVisible({ timeout: 10000 });
});

test('program audit log renders from fixtures', async ({ page }) => {
  await connectAdmin(page);
  await page.goto('/admin/programs/dogfooding');
  await signInOnPage(page);
  const audit = page.locator('div.panel').filter({ has: page.getByText('·AUDIT LOG', { exact: true }) });
  await expect(audit).toBeVisible({ timeout: 15000 });
  await expect(audit.getByText('program.update', { exact: false })).toBeVisible({ timeout: 10000 });
});

test('judging: rubric scoring loads for a tracked program', async ({ page }) => {
  await connectAdmin(page);
  await page.goto('/admin/programs/bitrefill-2026');
  await signInOnPage(page);
  const judging = page.locator('section').filter({ hasText: '·JUDGING' });
  await expect(judging.getByRole('button', { name: 'SCORE' })).toBeVisible({ timeout: 15000 });
  await expect(judging.getByRole('button', { name: 'RESULTS' })).toBeVisible();
});

test('no console errors during the journey', async () => {
  expect(consoleErrors).toEqual([]);
});

test('mock mode never contacted a real API host', async () => {
  expect(apiRequests).toEqual([]);
});
