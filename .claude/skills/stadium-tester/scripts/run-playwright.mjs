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
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
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

// --- minimal playwright config so the skill doesn't need to ship one ---
// Written into /tmp adjacent to the spec so we don't pollute the repo.
const configPath = args.spec.replace(/\.spec\.mjs$/, ".config.mjs");
writeFileSync(
  configPath,
  `import { defineConfig } from '@playwright/test';
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
const result = spawnSync(
  "npx",
  ["--no-install", "playwright", "test", "--config", configPath],
  { cwd: CLIENT_DIR, encoding: "utf8", env: { ...process.env, CI: "1" } },
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
