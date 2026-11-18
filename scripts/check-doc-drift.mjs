#!/usr/bin/env node
// Doc drift check (#310): every repo path and `npm run <script>` named in the
// agent-facing docs must exist. Run from the repo root:
//   node scripts/check-doc-drift.mjs
//
// Scans CLAUDE.md, docs/AGENTIC_WORKFLOW.md, docs/AGENT_GUIDE.md and every
// .md under .claude/. Checks backticked tokens that look like repo paths
// (contain a "/" and start with a known top-level dir, or are a root file) and
// `npm run <name>` mentions. Fenced code blocks are skipped. A line containing
// `drift-ignore` is skipped (use it for intentional placeholders).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const TOP_DIRS = ["client/", "server/", "docs/", ".claude/", ".github/", "supabase/", "scripts/", "hackathonia/"];
const ROOT_FILES = new Set(["CLAUDE.md", "README.md", "docker-compose.yml", ".gitignore"]);

function walkMd(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : walkMd(p);
    return name.endsWith(".md") ? [p] : [];
  });
}

const DOCS = [
  "CLAUDE.md",
  "docs/AGENTIC_WORKFLOW.md",
  "docs/AGENT_GUIDE.md",
  ...walkMd(join(ROOT, ".claude")).map((p) => relative(ROOT, p)),
].filter((p) => existsSync(join(ROOT, p)));

const scripts = new Set();
for (const dir of ["", "client", "server"]) {
  const pkg = join(ROOT, dir, "package.json");
  if (existsSync(pkg)) for (const s of Object.keys(JSON.parse(readFileSync(pkg, "utf8")).scripts || {})) scripts.add(s);
}

const isPlaceholder = (t) => /[<>*{}$]|\.\.\.|…|YourPage|\bX\b|<n>/.test(t);

function pathExists(token) {
  const clean = token.replace(/[),.;:]+$/, "").replace(/:\d+(-\d+)?$/, "").replace(/#.*$/, "");
  const p = join(ROOT, clean);
  return existsSync(p);
}

const problems = [];
for (const doc of DOCS) {
  const lines = readFileSync(join(ROOT, doc), "utf8").split("\n");
  let fence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; return; }
    if (fence || line.includes("drift-ignore")) return;
    for (const m of line.matchAll(/`([^`\n]+)`/g)) {
      const t = m[1].trim();
      for (const run of t.matchAll(/npm run ([\w:.-]+)/g)) {
        if (!isPlaceholder(run[1]) && !scripts.has(run[1])) problems.push(`${doc}:${i + 1}  npm script not found: ${run[1]}`);
      }
      if (/\s/.test(t) || isPlaceholder(t)) continue;
      if (/(^|\/)\.env$/.test(t)) continue; // local, gitignored (copied from .env.example)
      if (/(^|\/)node_modules(\/|$)/.test(t)) continue; // created by npm install, absent from a fresh checkout
      const looksLikePath = TOP_DIRS.some((d) => t.startsWith(d)) || ROOT_FILES.has(t);
      if (looksLikePath && !pathExists(t)) problems.push(`${doc}:${i + 1}  path not found: ${t}`);
    }
  });
}

if (problems.length) {
  console.error(`check-doc-drift: ${problems.length} stale reference(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`check-doc-drift ok: ${DOCS.length} docs, every repo path and npm script exists.`);
