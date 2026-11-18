/**
 * Guards for the stadium-tester runner (#304). Pure helpers, unit-tested in
 * scripts/__tests__/guards.test.mjs; run-playwright.mjs wires them up.
 *
 * Exit codes the runner uses:
 *   2 usage / spec-not-found / playwright-not-installed / bad target URL
 *   3 production-target-blocked
 *   4 mock-mode-not-enabled (non-local target without window.__STADIUM_MOCK__)
 *   5 preflight-failed (non-local target unreachable during the mock check)
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DENYLIST_PATH = resolve(__dirname, "..", "config", "denylist.json");

export const EXIT = Object.freeze({
  USAGE: 2,
  PRODUCTION_BLOCKED: 3,
  MOCK_MODE_NOT_ENABLED: 4,
  PREFLIGHT_FAILED: 5,
});

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

/** Parse a --target URL. Returns null for anything that isn't http(s). */
export function parseTarget(target) {
  try {
    const url = new URL(target);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

/** Hostname of a URL or bare host (STADIUM_PROD_API_HOST accepts either). */
function hostOf(value) {
  const v = String(value || "").trim();
  if (!v) return null;
  const url = parseTarget(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  return url ? url.hostname.toLowerCase().replace(/\.$/, "") : null;
}

/** Only these hosts skip the mock-mode preflight. */
export function isLocalTarget(url) {
  return LOCAL_HOSTS.has(url.hostname.toLowerCase());
}

export function loadDenylist(path = DENYLIST_PATH) {
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  return {
    hosts: (cfg.hosts || []).map((h) => h.toLowerCase()),
    hostPatterns: (cfg.hostPatterns || []).map((p) => new RegExp(p, "i")),
  };
}

/**
 * Whether the target's hostname is a production host. Matches the parsed
 * hostname only, so a production host in the path or query string doesn't
 * trip it and a look-alike host (stadium.joinwebzero.com.evil.com) isn't
 * mistaken for it. Subdomains of a denied host are denied too.
 *
 * @param {URL} url
 * @param {{ hosts: string[], hostPatterns: RegExp[] }} denylist
 * @param {Record<string, string|undefined>} [env] - STADIUM_PROD_API_HOST adds a host
 * @returns {string|null} the matching rule, or null if allowed
 */
export function productionMatch(url, denylist, env = process.env) {
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const hosts = [...denylist.hosts];
  const apiHost = hostOf(env.STADIUM_PROD_API_HOST);
  if (apiHost) hosts.push(apiHost);
  for (const h of hosts) {
    if (host === h || host.endsWith(`.${h}`)) return h;
  }
  for (const re of denylist.hostPatterns) {
    if (re.test(host)) return re.source;
  }
  return null;
}

/**
 * Load the target once in headless Chromium and read window.__STADIUM_MOCK__.
 * @param {string} target
 * @param {{ chromium: import('playwright').BrowserType }} playwright
 * @returns {Promise<{ ok: true, mock: unknown } | { ok: false, error: string }>}
 */
export async function readMockFlag(target, { chromium }, timeoutMs = 30_000) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(target, { waitUntil: "load", timeout: timeoutMs });
    // The flag is set when api.ts loads; give the SPA a moment to boot.
    await page
      .waitForFunction(() => typeof window.__STADIUM_MOCK__ !== "undefined", null, { timeout: 5_000 })
      .catch(() => {});
    const mock = await page.evaluate(() => window.__STADIUM_MOCK__);
    return { ok: true, mock };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    await browser?.close().catch(() => {});
  }
}
