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

import type { ApiProgram, ApiProgramSponsor } from "./api";

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
