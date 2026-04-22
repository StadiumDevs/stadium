/**
 * Mock fixture for the `programs` table. Read in preview mode when
 * VITE_USE_MOCK_DATA=true. Real data comes from Supabase via /api/programs.
 *
 * Extended across Block A of the Phase 1 revamp:
 *   - Issue #36 — fixture introduced (empty).
 *   - Issue #37 — Dogfooding 2026 added for public /programs surface.
 */

import type { ApiProgram } from "./api";

export const mockPrograms: ApiProgram[] = [
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
