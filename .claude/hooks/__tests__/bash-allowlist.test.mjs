// node --test '.claude/hooks/__tests__/*.test.mjs'
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decide } from "../bash-allowlist.mjs";

const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "..", "bash-allowlist.mjs");
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });
const TMP = tmpdir();

// Everything /pre-pr-check, the reviewer checklist and the explorer actually run.
const READ_ONLY_ALLOWED = [
  "git diff",
  "git diff --stat origin/develop...HEAD",
  "git log --oneline -20",
  "git show HEAD~1:server/server.js",
  "git status --short",
  "git branch --show-current",
  "git ls-files server/api",
  "cd server && npm test",
  "cd server && npm test 2>&1 | tail -20",
  "cd server && npm run lint",
  "cd server && npm run check:boot",
  "cd client && npm run build",
  "cd client && npm run build && npm run check:bundle",
  "cd client && npm run lint",
  "grep -rn \"BYPASS\" client/src --include=*.tsx",
  "rg -n 'requireAdmin' server/api",
  "ls -la .claude/agents",
  "cat CLAUDE.md | head -50",
  "sed -n '1,80p' server/api/middleware/auth.middleware.js",
  "find server/api -name '*.js' -newer package.json",
  "wc -l client/src/lib/api.ts",
  "gh pr view 314 --json title,body",
  "gh issue view 305",
  "gh pr diff 314",
  "awk '/export/ {print $2}' client/src/lib/api.ts",
  "node --version",
  "echo done >/dev/null 2>&1",
];

const READ_ONLY_BLOCKED = [
  ["echo x > client/src/x.ts", /redirection/],
  ["cat a >> b", /redirection/],
  ["sed -i '' 's/a/b/' CLAUDE.md", /sed -i/],
  ["sed --in-place s/a/b/ x", /sed -i/],
  ["tee client/src/x.ts < /dev/null", /not on the read-only allowlist/],
  ["git diff | tee out.txt", /tee/],
  ["rm -f client/src/x.ts", /rm/],
  ["mv a b", /mv/],
  ["cp a b", /cp/],
  ["git checkout -- client/src/x.ts", /git checkout/],
  ["git commit -m x", /git commit/],
  ["git push", /git push/],
  ["git branch -D main", /git branch may only list/],
  ["git stash", /git stash/],
  ["npm install lodash", /npm install/],
  ["npm run dev", /npm run dev/],
  ["node -e \"require('fs').writeFileSync('x','y')\"", /node/],
  ["python3 -c 'open(\"x\",\"w\")'", /python3/],
  ["find . -name x -delete", /-delete/],
  ["find . -exec rm {} \\;", /-exec/],
  ["awk 'BEGIN{print 1 > \"x\"}'", /awk|redirection/],
  ["echo $(rm -rf /)", /substitution/],
  ["cat `ls`", /substitution/],
  ["gh pr merge 1", /gh pr merge/],
  ["gh pr create --title x", /gh pr create/],
  ["curl https://example.com", /curl/],
  ["bash -c 'echo hi'", /bash/],
  ["FOO=1 npm publish", /npm publish/],
];

for (const role of ["reviewer", "explorer"]) {
  for (const cmd of READ_ONLY_ALLOWED) {
    test(`${role} allows: ${cmd}`, () => assert.equal(decide(role, bash(cmd)), null));
  }
  for (const [cmd, why] of READ_ONLY_BLOCKED) {
    test(`${role} blocks: ${cmd}`, () => assert.match(decide(role, bash(cmd)) ?? "ALLOWED", why));
  }
  test(`${role} may not Write/Edit`, () => {
    assert.ok(decide(role, { tool_name: "Write", tool_input: { file_path: join(TMP, "x") } }));
    assert.ok(decide(role, { tool_name: "Edit", tool_input: { file_path: "client/src/x.ts" } }));
  });
  test(`${role}: non-Bash read tools pass through`, () => {
    assert.equal(decide(role, { tool_name: "Read", tool_input: { file_path: "CLAUDE.md" } }), null);
    assert.equal(decide(role, { tool_name: "Grep", tool_input: { pattern: "x" } }), null);
  });
}

// What the stadium-tester agent runs (SKILL.md procedure + runner).
const TESTER_ALLOWED = [
  "test -d client/node_modules/@playwright/test || bash .claude/skills/stadium-tester/setup.sh",
  "node .claude/skills/stadium-tester/scripts/run-playwright.mjs --target http://localhost:8080 --spec /tmp/stadium-tester-ab12.spec.mjs",
  "VITE_USE_TEST_WALLET=true node .claude/skills/stadium-tester/scripts/run-playwright.mjs --target http://localhost:8080 --spec .claude/skills/stadium-tester/flows/client-journey.spec.mjs",
  "node --test '.claude/skills/stadium-tester/scripts/__tests__/*.test.mjs'",
  "cd client && npx --no-install playwright --version",
  "cat /tmp/stadium-tester-ab12.spec.mjs.json | jq '.suites[0]'",
  "mktemp -d",
  "rm -f /tmp/stadium-tester-ab12.spec.mjs",
  `rm -rf ${join(TMP, "stadium-tester-XYZ")}`,
  "cat > /tmp/stadium-tester-ab12.spec.mjs",
  "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/",
];

const TESTER_BLOCKED = [
  ["rm -rf client/test-results", /temp dir/],
  ["rm -f /tmp/../etc/passwd", /temp dir/],
  ["node -e \"require('fs').writeFileSync('x','y')\"", /runner/],
  ["node scripts/evil.mjs", /runner/],
  ["npx playwright test --config x", /playwright/],
  ["echo hi > client/src/x.ts", /outside the temp dir/],
  ["git checkout -- .", /git/],
  ["npm install", /npm/],
  ["curl -X POST https://stadium.joinwebzero.com/api", /GET/],
  ["sed -i '' s/a/b/ CLAUDE.md", /sed/],
  ["echo $(whoami)", /substitution/],
];

for (const cmd of TESTER_ALLOWED) {
  test(`tester allows: ${cmd}`, () => assert.equal(decide("tester", bash(cmd)), null));
}
for (const [cmd, why] of TESTER_BLOCKED) {
  test(`tester blocks: ${cmd}`, () => assert.match(decide("tester", bash(cmd)) ?? "ALLOWED", why));
}
test("tester may write spec files only under the temp dir", () => {
  assert.equal(decide("tester", { tool_name: "Write", tool_input: { file_path: "/tmp/stadium-tester-1.spec.mjs" } }), null);
  assert.equal(decide("tester", { tool_name: "Write", tool_input: { file_path: join(TMP, "s.spec.mjs") } }), null);
  assert.ok(decide("tester", { tool_name: "Write", tool_input: { file_path: "client/src/x.ts" } }));
  assert.ok(decide("tester", { tool_name: "Edit", tool_input: { file_path: ".claude/skills/stadium-tester/flows/client-journey.spec.mjs" } }));
});

// The hook as Claude Code runs it: JSON on stdin, exit 2 + stderr to block.
function runHook(role, payload) {
  return spawnSync(process.execPath, [HOOK, role], { input: payload, encoding: "utf8" });
}
test("CLI: allowed command exits 0", () => {
  assert.equal(runHook("reviewer", JSON.stringify(bash("git diff"))).status, 0);
});
test("CLI: blocked command exits 2 with a reason", () => {
  const r = runHook("reviewer", JSON.stringify(bash("echo x > a.ts")));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Blocked by the reviewer allowlist/);
});
test("CLI: unreadable input fails closed", () => {
  assert.equal(runHook("reviewer", "not json").status, 2);
  assert.equal(runHook("nobody", JSON.stringify(bash("ls"))).status, 2);
});
