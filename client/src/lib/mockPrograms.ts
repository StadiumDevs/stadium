/**
 * Mock fixture for the `programs` table. Read in preview mode when
 * VITE_USE_MOCK_DATA=true. Real data comes from Supabase via /api/programs.
 *
 * Extended across the Phase 1 revamp:
 *   - Issue #36 — fixture introduced (empty).
 *   - Issue #37 — Dogfooding 2026 cohort added for public /programs surface.
 *   - Issue #93 — historical hackathons + Bitrefill + singleton tracks added
 *     so previews mirror the canonical-events backfill migration.
 */

import type { ApiProgram, ApiProgramSignup, ApiProgramSponsor } from "./api";

export const mockPrograms: ApiProgram[] = [
  {
    id: "symbiosis-2025",
    name: "Symbiosis 2025",
    slug: "symbiosis-2025",
    programType: "hackathon",
    description: "WebZero Symbiosis 2025 hackathon.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: "2025-11-19T23:00:00Z",
    location: null,
    maxApplicants: null,
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: "2025-11-20T00:00:00Z",
  },
  {
    id: "symmetry-2024",
    name: "Symmetry 2024",
    slug: "symmetry-2024",
    programType: "hackathon",
    description: "WebZero Symmetry 2024 hackathon.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: "2024-08-22T04:55:00Z",
    location: null,
    maxApplicants: null,
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-08-23T00:00:00Z",
  },
  {
    id: "synergy-2025",
    name: "Synergy 2025",
    slug: "synergy-2025",
    programType: "hackathon",
    description: "WebZero Synergy 2025 hackathon.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: "2025-07-18T23:00:00Z",
    location: null,
    maxApplicants: null,
    createdAt: "2025-05-01T00:00:00Z",
    updatedAt: "2025-07-19T00:00:00Z",
  },
  {
    id: "bitrefill-2026",
    name: "Bitrefill 2026",
    slug: "bitrefill-2026",
    programType: "hackathon",
    description: "WebZero hackathon hosted with Bitrefill in Berlin.",
    status: "draft",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: "2026-06-17T00:00:00Z",
    eventEndsAt: null,
    location: "Berlin",
    maxApplicants: null,
    createdAt: "2026-05-20T00:00:00Z",
    updatedAt: "2026-05-20T00:00:00Z",
  },
  {
    id: "m2-incubator",
    name: "M2 Incubator",
    slug: "m2-incubator",
    programType: "m2_incubator",
    description:
      "Projects who've continued hacking in our mentorship and milestone-focused incubation programs.",
    status: "open",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: null,
    location: null,
    maxApplicants: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "dogfooding",
    name: "Dogfooding",
    slug: "dogfooding",
    programType: "dogfooding",
    description:
      "Continuation track where past winners trade structured feedback by using each other's products. Apply on an ongoing basis to get what you're building featured at our upcoming events.",
    status: "open",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: null,
    location: null,
    maxApplicants: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "dogfooding-2026-denver",
    name: "Dogfooding 2026 Denver",
    slug: "dogfooding-2026-denver",
    programType: "dogfooding",
    description:
      "Whether you're new to web3 or deep in it — when's the last time you actually used a new product, not just heard about one? Dogfooding Denver showcased 3–4 products built by WebZero hackathon teams. No jargon-filled panels, no slideshows — just hands-on time with real apps. Attendees picked a product, spent 30 minutes on guided tasks, and submitted feedback that went directly to the builders. No technical background or wallet required — just curiosity. The feedback shapes what gets built next.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: null,
    location: "Denver",
    maxApplicants: null,
    eventUrl: "https://luma.com/dogfooding",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-21T00:00:00Z",
  },
  {
    id: "pitchoff-2026-denver",
    name: "PitchOff! Denver 2026",
    slug: "pitchoff-2026-denver",
    programType: "pitch_off",
    description:
      "A live pitch event in Denver where WebZero builders presented their projects to the room. Attendees signed up, chose the projects they were most excited about, and could opt into the bounty round.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: "2026-02-21T00:00:00Z",
    eventEndsAt: "2026-02-21T23:59:59Z",
    location: "Denver",
    maxApplicants: null,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-21T00:00:00Z",
  },
];

/**
 * Per-program sponsor fixtures, keyed by program slug. Mock writes mutate
 * this in place so the preview mirrors the real /api/programs/:slug/sponsors
 * shape closely enough for UI work.
 */
export const mockProgramSponsors: Record<string, ApiProgramSponsor[]> = {
  "bitrefill-2026": [
    {
      id: "sponsor-bitrefill-2026-bitrefill",
      programId: "bitrefill-2026",
      name: "Bitrefill",
      submissionTarget: 10,
      targetProfiles: ["developer", "designer"],
      applicationInstructions:
        "Send a 1-paragraph pitch to apply@bitrefill.com with your wallet address and a link to your repo.",
      followUpNotes: "Send 1-week recap email; confirm winning team has KYC docs ready.",
      applyUrl: "https://bitrefill.com/apply",
      createdAt: "2026-05-20T00:00:00Z",
      updatedAt: "2026-05-20T00:00:00Z",
    },
  ],
};

// Illustrative PitchOff! Denver signups so the preview renders the public
// PROJECTS aggregate. Attendee fields are placeholders — only the "which
// project" raw_row column drives the public view.
const PITCHOFF_PROJECT_COL = "Which project would you like to try?";
const pitchoffSignup = (n: number, project: string): ApiProgramSignup => ({
  id: `pitchoff-signup-${n}`,
  programId: "pitchoff-2026-denver",
  email: `attendee${n}@example.com`,
  name: `Attendee ${n}`,
  wallet: null,
  registeredAt: "2026-02-21T18:00:00Z",
  source: "luma",
  rawRow: { [PITCHOFF_PROJECT_COL]: project },
  importedInBatchAt: "2026-02-22T00:00:00Z",
  createdAt: "2026-02-22T00:00:00Z",
});

/** Per-program signup fixtures (mock mode). */
export const mockProgramSignups: Record<string, ApiProgramSignup[]> = {
  "pitchoff-2026-denver": [
    pitchoffSignup(1, "Proof of Thought"),
    pitchoffSignup(2, "Chain of Providence"),
    pitchoffSignup(3, "Proof of Thought"),
    pitchoffSignup(4, "Sproto Gremlins"),
    pitchoffSignup(5, "Proof of Thought"),
    pitchoffSignup(6, "Chain of Providence"),
    pitchoffSignup(7, "Sproto Gremlins"),
    pitchoffSignup(8, "Proof of Thought"),
  ],
};

// Mirror of the server's project-summary aggregation (program-signup.service):
// group signups by the raw_row column whose header mentions "project",
// returning [{ project, count }] sorted by count desc then alpha. PII-free.
export function projectSummaryFromMockSignups(
  slug: string,
): Array<{ project: string; count: number }> {
  const signups = mockProgramSignups[slug] || [];
  if (signups.length === 0) return [];
  let projectKey: string | null = null;
  for (const s of signups) {
    const raw = s.rawRow;
    if (!raw) continue;
    const key = Object.keys(raw).find((k) => /project/i.test(k));
    if (key) { projectKey = key; break; }
  }
  if (!projectKey) return [];
  const counts = new Map<string, number>();
  for (const s of signups) {
    const value = s.rawRow?.[projectKey];
    if (typeof value !== "string") continue;
    const name = value.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([project, count]) => ({ project, count }))
    .sort((a, b) => b.count - a.count || a.project.localeCompare(b.project));
}

/**
 * Tiny CSV parser used only in mock mode so previews can demo the import
 * flow without a backend. Mirrors the canonical-field synonyms the server
 * parser supports.
 */
const HEADER_SYNONYMS = {
  email: ["email", "emailaddress", "mail"],
  name: ["name", "fullname", "attendeename"],
  wallet: ["wallet", "walletaddress", "address", "cryptowallet", "web3wallet"],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, "");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function importMockSignups(
  slug: string,
  csv: string,
  dryRun: boolean,
): {
  totalParsed: number;
  skippedNoEmail: number;
  duplicates: number;
  newCount: number;
  newPreview: Array<{ email: string; name?: string | null; wallet?: string | null }>;
  duplicatePreview: Array<{ email: string; name?: string | null }>;
} {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      totalParsed: 0, skippedNoEmail: 0, duplicates: 0, newCount: 0,
      newPreview: [], duplicatePreview: [],
    };
  }
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const idx = (synonyms: string[]) =>
    header.findIndex((h) => synonyms.includes(norm(h)));
  const emailIdx = idx(HEADER_SYNONYMS.email);
  const nameIdx = idx(HEADER_SYNONYMS.name);
  const walletIdx = idx(HEADER_SYNONYMS.wallet);

  const existing = mockProgramSignups[slug] || [];
  const existingEmails = new Set(existing.map((s) => s.email));

  let totalParsed = 0;
  let skipped = 0;
  const newRows: Array<{ email: string; name?: string | null; wallet?: string | null }> = [];
  const duplicates: Array<{ email: string; name?: string | null }> = [];

  for (let i = 1; i < lines.length; i += 1) {
    totalParsed += 1;
    const cols = parseCsvLine(lines[i]);
    const emailRaw = emailIdx >= 0 ? (cols[emailIdx] || "").trim().toLowerCase() : "";
    if (!emailRaw || !emailRaw.includes("@")) { skipped += 1; continue; }
    const name = nameIdx >= 0 ? (cols[nameIdx] || "").trim() || null : null;
    const wallet = walletIdx >= 0 ? (cols[walletIdx] || "").trim() || null : null;
    if (existingEmails.has(emailRaw)) {
      duplicates.push({ email: emailRaw, name });
    } else {
      newRows.push({ email: emailRaw, name, wallet });
      existingEmails.add(emailRaw);
    }
  }

  if (!dryRun && newRows.length > 0) {
    const inserted: ApiProgramSignup[] = newRows.map((r, i) => ({
      id: `mock-signup-${Date.now()}-${i}`,
      programId: slug,
      email: r.email,
      name: r.name,
      wallet: r.wallet,
      registeredAt: new Date().toISOString(),
      source: "luma",
      createdAt: new Date().toISOString(),
    }));
    mockProgramSignups[slug] = [...existing, ...inserted];
  }

  return {
    totalParsed,
    skippedNoEmail: skipped,
    duplicates: duplicates.length,
    newCount: newRows.length,
    newPreview: newRows.slice(0, 5),
    duplicatePreview: duplicates.slice(0, 5),
  };
}
