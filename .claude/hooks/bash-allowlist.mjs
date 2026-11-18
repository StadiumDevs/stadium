#!/usr/bin/env node
// PreToolUse hook: per-role command allowlist for Stadium's read-only agents (#305).
//
// Wired from each agent's frontmatter, so it only runs while that subagent is
// active:
//   hooks:
//     PreToolUse:
//       - matcher: "Bash|Write|Edit|NotebookEdit"
//         hooks:
//           - type: command
//             command: node "${CLAUDE_PROJECT_DIR}/.claude/hooks/bash-allowlist.mjs" reviewer
//
// Reads the hook JSON on stdin. Exit 0 allows the call; exit 2 blocks it and
// stderr is shown to the agent as the reason. Any parse problem blocks
// (fail closed).
//
// This is a guard against mistakes, not a sandbox: an allowlisted command
// (e.g. `npm test`) runs repo-defined scripts.

import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const ROLES = ["reviewer", "explorer", "tester"];

// --- command parsing ---------------------------------------------------------

/** Split a shell command on control operators (outside quotes). */
export function splitSegments(command) {
  const segments = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"') {
        cur += c + (command[++i] ?? "");
        continue;
      }
      cur += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      cur += c;
      continue;
    }
    const two = command.slice(i, i + 2);
    if (two === "&&" || two === "||") {
      segments.push(cur);
      cur = "";
      i++;
      continue;
    }
    if (c === ";" || c === "|" || c === "\n") {
      segments.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (quote) throw new Error("unbalanced quotes");
  segments.push(cur);
  return segments.map((s) => s.trim()).filter(Boolean);
}

/** Tokenize one segment into words (quotes removed). */
export function tokenize(segment) {
  const out = [];
  let cur = "";
  let quote = null;
  let has = false;
  for (let i = 0; i < segment.length; i++) {
    const c = segment[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      has = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (has || cur) out.push(cur);
      cur = "";
      has = false;
      continue;
    }
    cur += c;
    has = true;
  }
  if (has || cur) out.push(cur);
  return out;
}

const SAFE_REDIRECT = /^(\d?>&\d|\d?>\s*\/dev\/null)$/;

/** Reasons a whole command is never allowed for read-only roles. */
function dangerousSyntax(command) {
  if (/`|\$\(|<\(|>\(/.test(command)) return "command substitution is not allowed";
  // Output redirection to a file (allow 2>&1, >/dev/null, 2>/dev/null).
  const redirects = command.match(/\d?>>?\s*(&\d|[^\s;&|]+)/g) || [];
  for (const r of redirects) {
    if (!SAFE_REDIRECT.test(r.replace(/\s+/g, ""))) return `output redirection (${r.trim()}) is not allowed`;
  }
  return null;
}

/** Strip leading VAR=value assignments. */
function stripEnv(words) {
  let i = 0;
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i++;
  return words.slice(i);
}

// --- per-role rules ----------------------------------------------------------

const READ_TOOLS = new Set([
  "ls", "cat", "head", "tail", "wc", "grep", "rg", "sort", "uniq", "cut", "tr",
  "jq", "pwd", "echo", "printf", "true", "false", "test", "[", "basename",
  "dirname", "realpath", "file", "stat", "diff", "comm", "which", "date",
]);

const GIT_READ = new Set([
  "diff", "log", "show", "status", "blame", "grep", "ls-files", "ls-tree",
  "rev-parse", "merge-base", "shortlog", "describe", "cat-file", "name-rev",
]);

const NPM_RUN_OK = new Set(["test", "lint", "build", "check:boot", "check:bundle"]);

const GH_READ = [
  ["issue", "view"], ["issue", "list"], ["pr", "view"], ["pr", "diff"],
  ["pr", "list"], ["pr", "checks"],
];

function readOnlySegment(words) {
  const [cmd, ...rest] = words;
  if (cmd === "cd") return null;
  if (READ_TOOLS.has(cmd)) return null;
  if (cmd === "sed") {
    return rest.some((w) => /^-[a-zA-Z]*i/.test(w) || w === "--in-place") ? "sed -i is not allowed" : null;
  }
  if (cmd === "find") {
    return rest.some((w) => /^-(delete|exec|execdir|ok|okdir|fprint|fprintf|fls)$/.test(w))
      ? "find with -delete/-exec/-fprint is not allowed"
      : null;
  }
  if (cmd === "awk") {
    // awk can write files (print > "x", system()); only allow simple programs.
    return /system\s*\(|>\s*"|\|\s*"/.test(rest.join(" ")) ? "awk writes/system() are not allowed" : null;
  }
  if (cmd === "git") {
    const sub = rest.find((w) => !w.startsWith("-"));
    if (sub === "branch") {
      return rest.some((w) => /^-(d|D|m|M|c|C|f|-delete|-move|-copy|-force|-set-upstream-to|-unset-upstream|-edit-description)$/.test(w))
        ? "git branch may only list"
        : null;
    }
    return GIT_READ.has(sub) ? null : `git ${sub ?? ""} is not allowed (read-only git only)`;
  }
  if (cmd === "npm") {
    if (rest[0] === "test" && rest.length === 1) return null;
    if (rest[0] === "run" && NPM_RUN_OK.has(rest[1]) && rest.length === 2) return null;
    if (rest[0] === "--version" || rest[0] === "-v") return null;
    return `npm ${rest.join(" ")} is not allowed`;
  }
  if (cmd === "node" && rest.length === 1 && /^(--version|-v)$/.test(rest[0])) return null;
  if (cmd === "gh") {
    return GH_READ.some(([a, b]) => rest[0] === a && rest[1] === b) ? null : `gh ${rest.slice(0, 2).join(" ")} is not allowed`;
  }
  return `\`${cmd}\` is not on the read-only allowlist`;
}

const TMP_ROOTS = [...new Set([tmpdir(), "/tmp", "/private/tmp", "/var/folders", "/private/var/folders"])]
  .map((p) => p.replace(/\/+$/, ""));
const underTmp = (p) => TMP_ROOTS.some((root) => p === root || p.startsWith(`${root}/`)) && !p.includes("..");
const RUNNER = /(^|\/)\.claude\/skills\/stadium-tester\/scripts\/run-playwright\.mjs$/;
const TESTER_TESTS = /(^|\/)\.claude\/skills\/stadium-tester\/scripts\/__tests__\//;

function testerSegment(words) {
  const [cmd, ...rest] = words;
  if (["ls", "cat", "head", "tail", "wc", "grep", "jq", "pwd", "echo", "test", "[", "true"].includes(cmd)) return null;
  if (cmd === "cd") return null;
  if (cmd === "node") {
    if (rest[0] && RUNNER.test(rest[0])) return null;
    if (rest[0] === "--test" && rest[1] && TESTER_TESTS.test(rest[1])) return null;
    if (rest.length === 1 && /^(--version|-v)$/.test(rest[0])) return null;
    return "node may only run the stadium-tester runner or its tests";
  }
  if (cmd === "npx") {
    const args = rest.filter((w) => w !== "--no-install" && w !== "--yes" && w !== "-y");
    if (args[0] === "playwright" && ["--version", "install"].includes(args[1])) return null;
    return "npx may only run `playwright --version` / `playwright install`";
  }
  if (cmd === "bash" && rest.length === 1 && /(^|\/)\.claude\/skills\/stadium-tester\/setup\.sh$/.test(rest[0])) return null;
  if (cmd === "mktemp") return null;
  if (cmd === "rm") {
    const paths = rest.filter((w) => !w.startsWith("-"));
    if (paths.length && paths.every(underTmp)) return null;
    return "rm is only allowed on paths under the system temp dir";
  }
  if (cmd === "curl") {
    for (let i = 0; i < rest.length; i++) {
      const w = rest[i];
      if (w === "-o" || w === "--output") {
        if (rest[i + 1] !== "/dev/null") return "curl may only GET (output to stdout or /dev/null)";
        i++;
        continue;
      }
      if (/^-(O|T|d|F|X)$|^--(output=|upload-file|data|form|request)/.test(w)) {
        return "curl may only GET (output to stdout or /dev/null)";
      }
    }
    return null;
  }
  return `\`${cmd}\` is not on the tester allowlist`;
}

// --- decision ----------------------------------------------------------------

/**
 * @returns {string|null} a block reason, or null to allow
 */
export function decide(role, input) {
  if (!ROLES.includes(role)) return `unknown role "${role}"`;
  const tool = input?.tool_name;
  const toolInput = input?.tool_input || {};

  if (tool === "Write" || tool === "Edit" || tool === "NotebookEdit") {
    if (role !== "tester") return `${role} may not edit files`;
    const p = String(toolInput.file_path || toolInput.notebook_path || "");
    return p && underTmp(p) ? null : "the tester may only write files under the system temp dir";
  }
  if (tool !== "Bash") return null;

  const command = String(toolInput.command || "");
  if (!command.trim()) return "empty command";
  if (role === "tester" && /`|\$\(|<\(|>\(/.test(command)) return "command substitution is not allowed";
  if (role !== "tester") {
    const bad = dangerousSyntax(command);
    if (bad) return bad;
  } else {
    // Tester may redirect only into the temp dir (e.g. writing a spec).
    const redirects = command.match(/\d?>>?\s*(&\d|[^\s;&|]+)/g) || [];
    for (const r of redirects) {
      const target = r.replace(/^\d?>>?\s*/, "");
      if (!SAFE_REDIRECT.test(r.replace(/\s+/g, "")) && !underTmp(target)) {
        return `output redirection outside the temp dir (${r.trim()}) is not allowed`;
      }
    }
  }

  let segments;
  try {
    segments = splitSegments(command);
  } catch (e) {
    return `could not parse command: ${e.message}`;
  }
  for (const segment of segments) {
    // Remove redirections already vetted above, then check the command itself.
    const words = stripEnv(tokenize(segment.replace(/\d?>>?\s*(&\d|[^\s;&|]+)/g, " ")));
    if (words.length === 0) continue;
    const reason = role === "tester" ? testerSegment(words) : readOnlySegment(words);
    if (reason) return reason;
  }
  return null;
}

// --- main --------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const role = process.argv[2];
  let reason;
  try {
    reason = decide(role, JSON.parse(readFileSync(0, "utf8")));
  } catch (e) {
    reason = `hook could not read its input (${e.message})`;
  }
  if (reason) {
    process.stderr.write(`Blocked by the ${role ?? "?"} allowlist (.claude/hooks/bash-allowlist.mjs): ${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}
