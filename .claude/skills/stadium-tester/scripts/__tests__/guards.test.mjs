// Tests for the stadium-tester runner guards (#304).
//   node --test .claude/skills/stadium-tester/scripts/
// Browser-backed cases (mock-mode preflight, no-repo-writes) need
// client/node_modules/@playwright/test plus Chromium, and skip without them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXIT,
  parseTarget,
  isLocalTarget,
  loadDenylist,
  productionMatch,
} from "../guards.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUNNER = resolve(__dirname, "..", "run-playwright.mjs");
const REPO_ROOT = resolve(__dirname, "..", "..", "..", "..", "..");
const PLAYWRIGHT_ENTRY = resolve(REPO_ROOT, "client/node_modules/@playwright/test/index.mjs");
const HAS_PLAYWRIGHT = existsSync(PLAYWRIGHT_ENTRY);

const denylist = loadDenylist();
const blocked = (target, env = {}) => productionMatch(parseTarget(target), denylist, env);

function runRunner(target, spec, env = {}) {
  return spawnSync(process.execPath, [RUNNER, "--target", target, "--spec", spec], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 120_000,
  });
}

// Async variant: the test's own HTTP server must keep serving while the runner
// (and its browser) talk to it, which spawnSync would block.
function runRunnerAsync(target, spec, env = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [RUNNER, "--target", target, "--spec", spec], {
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolveRun({ status, stdout, stderr }));
  });
}

function tempSpec(body) {
  const dir = mkdtempSync(join(tmpdir(), "guards-test-"));
  const spec = join(dir, "probe.spec.mjs");
  writeFileSync(spec, body);
  return { dir, spec };
}

// --- pure guards ---

test("production web, Vercel and API hosts are blocked", () => {
  assert.ok(blocked("https://stadium.joinwebzero.com"));
  assert.ok(blocked("https://STADIUM.JOINWEBZERO.COM/admin"));
  assert.ok(blocked("https://www.stadium.joinwebzero.com/"));
  assert.ok(blocked("https://stadium-nu.vercel.app/programs"));
  assert.ok(blocked("https://stadium-production-996a.up.railway.app/api/health"));
});

test("matching uses the parsed hostname, not the raw string", () => {
  assert.equal(blocked("https://evil.example/?next=stadium.joinwebzero.com"), null);
  assert.equal(blocked("https://stadium.joinwebzero.com.evil.example/"), null);
  assert.equal(blocked("https://preview.example/stadium-production-996a.up.railway.app"), null);
  assert.equal(blocked("https://stadium-git-feat-x-sachalanskys-projects.vercel.app"), null);
  assert.equal(blocked("http://localhost:8080"), null);
});

test("STADIUM_PROD_API_HOST adds the production API host", () => {
  assert.equal(blocked("https://api.stadium.example/x"), null);
  assert.ok(blocked("https://api.stadium.example/x", { STADIUM_PROD_API_HOST: "https://api.stadium.example/api" }));
  assert.ok(blocked("https://api.stadium.example/x", { STADIUM_PROD_API_HOST: "api.stadium.example:443" }));
  assert.ok(blocked("https://api.stadium.example/x", { STADIUM_PROD_API_HOST: "https://user@API.stadium.example" }));
});

test("only loopback targets skip the mock-mode preflight", () => {
  assert.equal(isLocalTarget(parseTarget("http://localhost:8080")), true);
  assert.equal(isLocalTarget(parseTarget("http://127.0.0.1:8080")), true);
  assert.equal(isLocalTarget(parseTarget("http://[::1]:8080")), true);
  assert.equal(isLocalTarget(parseTarget("https://stadium-git-x.vercel.app")), false);
  assert.equal(isLocalTarget(parseTarget("http://127.0.0.2:8080")), false);
});

test("non-http targets are rejected", () => {
  assert.equal(parseTarget("file:///etc/passwd"), null);
  assert.equal(parseTarget("not a url"), null);
});

// --- runner exit codes ---

test("runner exits 3 for a production target", () => {
  const { spec } = tempSpec("export {};\n");
  const r = runRunner("https://stadium-nu.vercel.app", spec);
  assert.equal(r.status, EXIT.PRODUCTION_BLOCKED, r.stderr);
  assert.match(r.stderr, /production-target-blocked/);
});

test("runner exits 2 for a non-http target", () => {
  const { spec } = tempSpec("export {};\n");
  const r = runRunner("file:///tmp/x", spec);
  assert.equal(r.status, EXIT.USAGE, r.stderr);
  assert.match(r.stderr, /invalid-target/);
});

// A tiny site with or without the mock flag.
async function withSite(mockFlag, fn) {
  const html = `<!doctype html><title>t</title><script>window.__STADIUM_MOCK__ = ${mockFlag};</script>`;
  const server = createServer((_, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    return await fn(server.address().port);
  } finally {
    server.close();
  }
}

test("runner exits 4 when a remote target is not in mock mode", { skip: !HAS_PLAYWRIGHT && "playwright not installed" }, async () => {
  const { spec } = tempSpec("export {};\n");
  await withSite("false", async (port) => {
    // Force the remote-target preflight on a loopback test server.
    const r = await runRunnerAsync(`http://127.0.0.1:${port}/`, spec, { STADIUM_TESTER_FORCE_PREFLIGHT: "1" });
    assert.equal(r.status, EXIT.MOCK_MODE_NOT_ENABLED, r.stderr);
    assert.match(r.stderr, /mock-mode-not-enabled/);
  });
});

test("the preflight passes a remote target that is in mock mode", { skip: !HAS_PLAYWRIGHT && "playwright not installed" }, async () => {
  const body = `import { test } from '@playwright/test';\ntest('noop', async () => {});\n`;
  const { spec } = tempSpec(body);
  await withSite("true", async (port) => {
    const r = await runRunnerAsync(`http://127.0.0.1:${port}/`, spec, { STADIUM_TESTER_FORCE_PREFLIGHT: "1" });
    assert.equal(r.status, 0, r.stderr);
  });
});

test("runner leaves the spec's directory untouched", { skip: !HAS_PLAYWRIGHT && "playwright not installed" }, async () => {
  const body = `import { test, expect } from '@playwright/test';
test('flag', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => window.__STADIUM_MOCK__)).toBe(true);
});
`;
  const { dir, spec } = tempSpec(body);
  await withSite("true", async (port) => {
    const r = await runRunnerAsync(`http://127.0.0.1:${port}/`, spec);
    assert.equal(r.status, 0, r.stderr);
    const summary = JSON.parse(r.stdout);
    assert.ok(existsSync(summary.reporterPath));
    assert.ok(!summary.reporterPath.startsWith(dir));
  });
  assert.deepEqual(readdirSync(dir), ["probe.spec.mjs"]);
  assert.equal(readFileSync(spec, "utf8"), body);
});
