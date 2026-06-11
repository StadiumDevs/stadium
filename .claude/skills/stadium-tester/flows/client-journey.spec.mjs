import { test, expect } from '@playwright/test';

// Canonical wallet-gated client journey, driven by the //Alice test wallet
// (signs for real) against the mock-mode harness. Validated green; the
// stadium-tester runs this verbatim — it is NOT a per-run scratch spec.
//
// Launch the target first:
//   cd client && npm run dev:harness     # mock + test wallet + Alice whitelisted
// Then run:
//   VITE_USE_TEST_WALLET=true node .claude/skills/stadium-tester/scripts/run-playwright.mjs \
//     --target http://localhost:8080 \
//     --spec .claude/skills/stadium-tester/flows/client-journey.spec.mjs
//
// Note: some non-judging admin sections (audit log, applications) have no mock
// branch and log ERR_CONNECTION_REFUSED in mock mode — filtered from the error
// gate below so it reflects only real client-journey errors.

const IGNORABLE = /ERR_CONNECTION_REFUSED|Failed to load resource/i;
const consoleErrors = [];
test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !IGNORABLE.test(msg.text())) consoleErrors.push(msg.text());
  });
  // Deterministic mock judging state for each flow.
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('stadium_mock_scores_v1');
      localStorage.removeItem('stadium_mock_ballot_v1');
      localStorage.removeItem('stadium_mock_promoted_v1');
      localStorage.removeItem('stadium_mock_paid_v1');
    } catch { /* ignore */ }
  });
});

async function connectAdmin(page) {
  await page.goto('/admin');
  await page.getByRole('button', { name: /CONNECT ADMIN WALLET/i }).click();
  await expect(page.getByText('·ADMIN / DASHBOARD')).toBeVisible({ timeout: 15000 });
}

test('preview-mode + test-wallet sanity', async ({ page }) => {
  await page.goto('/');
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

test('public submit form accepts a project', async ({ page }) => {
  await page.goto('/programs/bitrefill-2026');
  await page.getByRole('button', { name: /SUBMIT A PROJECT/i }).click();
  await page.locator('#sub-name').fill('Harness Tester');
  await page.locator('#sub-email').fill('harness@example.com');
  await page.locator('#sub-title').fill('Harness Project');
  await page.locator('#sub-video').fill('https://youtu.be/harness');
  await page.locator('#sub-github').fill('https://github.com/example/harness');
  await page.getByRole('button', { name: /SUBMIT PROJECT/i }).click();
  // Mock returns success; the modal closes. (Dedup of a repeat Luma email is a
  // server-side guarantee covered by the Vitest suite, not reproducible in mock.)
  await expect(page.getByRole('button', { name: /SUBMIT PROJECT/i })).toHaveCount(0, { timeout: 10000 });
});

test('judging: score all, submit ballot, leaderboard reveals the winner', async ({ page }) => {
  await connectAdmin(page);
  await page.goto('/admin/programs/bitrefill-2026');
  const judging = page.locator('section').filter({ hasText: '·JUDGING' });
  await expect(judging.getByRole('button', { name: 'SCORE' })).toBeVisible({ timeout: 15000 });
  // Submissions load async — wait for a known one before scoring.
  await expect(judging.getByText('Aurora Pay')).toBeVisible({ timeout: 15000 });

  // Score every submission (2 is valid for /2 and /5), then save each.
  const numbers = judging.locator('input[type="number"]');
  await expect(numbers.first()).toBeVisible({ timeout: 10000 });
  const count = await numbers.count();
  expect(count).toBeGreaterThanOrEqual(9); // 3 submissions x 3 criteria
  for (let i = 0; i < count; i++) await numbers.nth(i).fill('2');
  const saves = judging.getByRole('button', { name: 'SAVE' });
  const saveCount = await saves.count();
  for (let i = 0; i < saveCount; i++) await saves.nth(i).click();

  // Promote + mark paid the first submission (high-value actions; Alice signs).
  await judging.getByRole('button', { name: /ADD TO STADIUM/i }).first().click();
  await expect(judging.getByText(/IN STADIUM/i).first()).toBeVisible({ timeout: 10000 });
  await judging.getByRole('button', { name: /^MARK PAID$/i }).first().click();
  await expect(judging.getByText('·PAID').first()).toBeVisible({ timeout: 10000 });

  // Submit the ballot, then the leaderboard unlocks with a ranked winner.
  await judging.getByRole('button', { name: /SUBMIT MY SCORES/i }).click();
  await judging.getByRole('button', { name: 'LEADERBOARD' }).click();
  await expect(judging.getByText(/JUDGES · FINAL/i)).toBeVisible({ timeout: 15000 });
  // Aurora Pay is the deterministic #1 (other judge's fixed scores rank it top).
  const firstRow = judging.locator('tbody tr').first();
  await expect(firstRow).toContainText('1');
  await expect(firstRow).toContainText('Aurora Pay');
});

test('no unexpected console errors during the journey', async () => {
  expect(consoleErrors).toEqual([]);
});
