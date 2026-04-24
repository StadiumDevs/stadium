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
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

if (!args.target || !args.spec) {
  console.error("Usage: run-playwright.mjs --target <url> --spec <path-to-spec>");
  process.exit(2);
}

// --- guardrail: refuse production hostnames ---
const PROD_DENYLIST = [
  /stadium\.joinwebzero\.com/i,
  // Allow railway preview/staging if explicitly named, but block bare prod hosts:
  /stadium-production-\w+\.up\.railway\.app/i,
];
if (PROD_DENYLIST.some((re) => re.test(args.target))) {
  console.error(JSON.stringify({
    error: "production-target-blocked",
    message: `Refusing to run against production host: ${args.target}`,
  }));
  process.exit(3);
}

if (!existsSync(args.spec)) {
  console.error(JSON.stringify({ error: "spec-not-found", spec: args.spec }));
  process.exit(2);
}

// Specs and the generated config both land in /tmp, so bare `@playwright/test`
// imports can't resolve (ESM walks up from the importer's dir; /tmp has no
// node_modules). Point every import at the absolute entry file inside
// client/node_modules instead.
const PLAYWRIGHT_ENTRY = resolve(CLIENT_DIR, "node_modules/@playwright/test/index.mjs");
if (!existsSync(PLAYWRIGHT_ENTRY)) {
  console.error(JSON.stringify({
    error: "playwright-not-installed",
    message: `@playwright/test not found at ${PLAYWRIGHT_ENTRY}. Run .claude/skills/stadium-tester/setup.sh first.`,
  }));
  process.exit(2);
}

// --- rewrite `@playwright/test` imports in the spec to absolute paths ---
const specSrc = readFileSync(args.spec, "utf8");
const rewritten = specSrc.replace(
  /(from\s+['"])@playwright\/test(['"])/g,
  `$1${PLAYWRIGHT_ENTRY}$2`,
);
if (rewritten !== specSrc) writeFileSync(args.spec, rewritten);

// --- minimal playwright config so the skill doesn't need to ship one ---
const configPath = args.spec.replace(/\.spec\.mjs$/, ".config.mjs");
writeFileSync(
  configPath,
  `import { defineConfig } from '${PLAYWRIGHT_ENTRY}';
export default defineConfig({
  testDir: '${dirname(args.spec)}',
  testMatch: ['${args.spec.split("/").pop()}'],
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['json', { outputFile: '${args.spec}.json' }]],
  use: {
    baseURL: '${args.target}',
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
});
`,
);

// --- run playwright (resolves @playwright/test from client/node_modules) ---
// VITE_USE_TEST_WALLET is forwarded if set on the host so the tester can drive
// SIWS-gated flows against a dev server / preview URL that bundled the flag.
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
  target: args.target,
  spec: args.spec,
  exitCode: result.status,
  reporterPath: `${args.spec}.json`,
  hint:
    result.status === 0
      ? "all-pass"
      : result.status === 1
      ? "test-failures-see-reporter"
      : "runner-error-see-stderr",
};
console.log(JSON.stringify(summary, null, 2));
process.exit(result.status === null ? 1 : result.status);
