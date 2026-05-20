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
      "Continuation track for event winners — focused build sprint with a mentor.",
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
      "Continuation track where past winners trade structured feedback by using each other's products.",
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
    id: "dogfooding-2026-berlin",
    name: "Dogfooding 2026",
    slug: "dogfooding-2026-berlin",
    programType: "dogfooding",
    description:
      "A week in Berlin for past WebZero winners. Bring the thing you've been building, show it to the rest of the cohort, get structured feedback from builders who've shipped. No pitches, no sponsor deck — just a room full of people who want to help your project feel more real.",
    status: "open",
    owner: "webzero",
    applicationsOpenAt: "2026-04-22T00:00:00Z",
    applicationsCloseAt: "2026-05-30T23:59:59Z",
    eventStartsAt: "2026-06-13T00:00:00Z",
    eventEndsAt: "2026-06-19T23:59:59Z",
    location: "Berlin",
    maxApplicants: null,
    createdAt: "2026-04-22T00:00:00Z",
    updatedAt: "2026-04-22T00:00:00Z",
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

/** Per-program signup fixtures (mock mode). */
export const mockProgramSignups: Record<string, ApiProgramSignup[]> = {};

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
