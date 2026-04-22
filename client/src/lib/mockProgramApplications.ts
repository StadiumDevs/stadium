/**
 * Mock fixture for `program_applications`. Seeded with one application so
 * Block E's "Programs" section on project detail pages lights up in preview
 * mode.
 *
 * Phase 1 revamp, issue #43.
 */

import type { ApiProgramApplication } from "./api";

export const mockProgramApplications: ApiProgramApplication[] = [
  {
    id: "app-plata-dogfooding-1",
    programId: "dogfooding-2026-berlin",
    projectId: "plata-mia-15ac43",
    status: "submitted",
    applicationFields: {
      feedback_focus:
        "We'd love structured feedback on the UX of our stealth-transfer flow — specifically whether the one-step deposit is discoverable.",
    },
    submittedBy: "mock-wallet",
    submittedAt: "2026-04-22T11:30:00Z",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
  },
];
