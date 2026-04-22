/**
 * Mock fixture for the `programs` table. Read in preview mode when
 * VITE_USE_MOCK_DATA=true. Real data comes from Supabase via /api/programs.
 *
 * Extended across Block A of the Phase 1 revamp:
 *   - Issue #36 (this file, empty) — fixture placeholder so the admin table
 *     can render an empty state in preview mode.
 *   - Issue #37 — Dogfooding 2026 added (public /programs surface).
 */

import type { ApiProgram } from "./api";

export const mockPrograms: ApiProgram[] = [];
