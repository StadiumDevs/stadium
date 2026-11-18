#!/usr/bin/env node
/**
 * Tiny driver the stadium-tester skill writes per-run scenarios into.
 *
 * Usage from the skill:
 *   1. Skill writes a Playwright spec to /tmp/stadium-tester-<id>.spec.mjs
 *   2. Skill calls:
 *        node .claude/skills/stadium-tester/scripts/run-playwright.mjs \
 *          --target <url> \
 *          --spec /tmp/stadium-tester-<id>.spec.mjs
 *   3. This driver runs Playwright, captures the JSON reporter, prints a
 *      single JSON summary on stdout (and the raw reporter output on stderr).
 *
 * The skill parses the stdout JSON to fill its markdown report.
 *
 * Why a separate driver:
 *   - Centralizes the headless-Chromium launch flags, prod-URL guard, and
 *     console-error capture so the skill body stays declarative.
 *   - Lets us swap the underlying runner later without touching SKILL.md.
 *
 * Guards (#304, see guards.mjs for exit codes):
 *   - production hosts (config/denylist.json + STADIUM_PROD_API_HOST) → exit 3
 *   - non-local target without window.__STADIUM_MOCK__ === true → exit 4
 *   - the spec is copied into a fresh temp dir; the config, JSON report and
 *     screenshots are written there, so a run never writes into the repo.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXIT,
  parseTarget,
  isLocalTarget,
  loadDenylist,
  productionMatch,
  readMockFlag,
} from "./guards.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..");
const CLIENT_DIR = resolve(REPO_ROOT, "client");

// --- arg parsing (intentionally tiny — no dep) ---
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--") && i + 1 < arr.length) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

const fail = (code, payload) => {
  console.error(JSON.stringify(payload));
  process.exit(code);
};

if (!args.target || !args.spec) {
  console.error("Usage: run-playwright.mjs --target <url> --spec <path-to-spec>");
  process.exit(EXIT.USAGE);
}

const targetUrl = parseTarget(args.target);
if (!targetUrl) {
  fail(EXIT.USAGE, { error: "invalid-target", message: `Not an http(s) URL: ${args.target}` });
}

// --- guardrail: refuse production hosts (parsed hostname, shared denylist) ---
const rule = productionMatch(targetUrl, loadDenylist());
if (rule) {
  fail(EXIT.PRODUCTION_BLOCKED, {
    error: "production-target-blocked",
    message: `Refusing to run against production host: ${targetUrl.hostname} (rule: ${rule})`,
  });
}

const specPath = resolve(args.spec);
if (!existsSync(specPath)) {
  fail(EXIT.USAGE, { error: "spec-not-found", spec: args.spec });
}

// Specs run from a temp dir, so bare `@playwright/test` imports can't resolve
// (ESM walks up from the importer's dir). Point every import at the absolute
// entry file inside client/node_modules instead.
const PLAYWRIGHT_ENTRY = resolve(CLIENT_DIR, "node_modules/@playwright/test/index.mjs");
if (!existsSync(PLAYWRIGHT_ENTRY)) {
  fail(EXIT.USAGE, {
    error: "playwright-not-installed",
    message: `@playwright/test not found at ${PLAYWRIGHT_ENTRY}. Run .claude/skills/stadium-tester/setup.sh first.`,
  });
}

// --- guardrail: remote targets must be serving fixtures (mock mode) ---
// STADIUM_TESTER_FORCE_PREFLIGHT=1 runs the check on local targets too (tests);
// it can only add the check, never skip it.
if (!isLocalTarget(targetUrl) || process.env.STADIUM_TESTER_FORCE_PREFLIGHT === "1") {
  const playwright = await import(PLAYWRIGHT_ENTRY);
  const flag = await readMockFlag(targetUrl.href, playwright);
  if (!flag.ok) {
    fail(EXIT.PREFLIGHT_FAILED, { error: "preflight-failed", target: targetUrl.href, message: flag.error });
  }
  if (flag.mock !== true) {
    fail(EXIT.MOCK_MODE_NOT_ENABLED, {
      error: "mock-mode-not-enabled",
      target: targetUrl.href,
      message: `window.__STADIUM_MOCK__ is ${JSON.stringify(flag.mock)}; remote targets must run with VITE_USE_MOCK_DATA=true`,
    });
  }
}

// --- work in a fresh temp dir: never write next to the caller's spec ---
const runDir = mkdtempSync(join(tmpdir(), "stadium-tester-"));
const specName = basename(specPath).endsWith(".spec.mjs")
  ? basename(specPath)
  : `${basename(specPath).replace(/\.m?js$/, "")}.spec.mjs`;
const runSpec = join(runDir, specName);
copyFileSync(specPath, runSpec);
writeFileSync(
  runSpec,
  readFileSync(runSpec, "utf8").replace(/(from\s+['"])@playwright\/test(['"])/g, `$1${PLAYWRIGHT_ENTRY}$2`),
);

const reporterPath = join(runDir, "report.json");
const outputDir = join(runDir, "test-results");
const configPath = join(runDir, "playwright.config.mjs");
writeFileSync(
  configPath,
  `import { defineConfig } from ${JSON.stringify(PLAYWRIGHT_ENTRY)};
export default defineConfig({
  testDir: ${JSON.stringify(runDir)},
  testMatch: [${JSON.stringify(specName)}],
  outputDir: ${JSON.stringify(outputDir)},
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['json', { outputFile: ${JSON.stringify(reporterPath)} }]],
  use: {
    baseURL: ${JSON.stringify(targetUrl.href.replace(/\/$/, ""))},
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
`,
);

// --- run playwright (resolves @playwright/test from client/node_modules) ---
// VITE_USE_TEST_WALLET is forwarded if set on the host so the tester can drive
// SIWS-gated flows against a dev server that bundled the flag.
// The flag is client-side only — the server never sees it.
const result = spawnSync(
  "npx",
  ["--no-install", "playwright", "test", "--config", configPath],
  {
    cwd: CLIENT_DIR,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "1",
      ...(process.env.VITE_USE_TEST_WALLET
        ? { VITE_USE_TEST_WALLET: process.env.VITE_USE_TEST_WALLET }
        : {}),
    },
  },
);

// Surface raw reporter output to stderr for debugging
process.stderr.write(result.stdout || "");
process.stderr.write(result.stderr || "");

// --- summarize for the skill ---
const summary = {
  target: targetUrl.href,
  spec: args.spec,
  exitCode: result.status,
  runDir,
  reporterPath,
  screenshotsDir: outputDir,
  hint:
    result.status === 0
      ? "all-pass"
      : result.status === 1
      ? "test-failures-see-reporter"
      : "runner-error-see-stderr",
};
console.log(JSON.stringify(summary, null, 2));
process.exit(result.status === null ? 1 : result.status);
