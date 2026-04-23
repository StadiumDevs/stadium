/**
 * Mock fixture for the `project_updates` table. Seeded for a couple of
 * projects so the Updates tab renders its populated state in preview mode.
 *
 * Phase 1 revamp, issue #40.
 */

import type { ApiProjectUpdate } from "./api";

export const mockProjectUpdates: ApiProjectUpdate[] = [
  {
    id: "upd-plata-mia-1",
    projectId: "plata-mia-15ac43",
    body: "Shipped v2 of the stealth transfer flow this week — one-step deposit is live and we've had two teams try it end-to-end. Docs will land in a few days.",
    linkUrl: "https://plata-mia.vercel.app/",
    createdBy: "5MockWalletAddressRedactedForPreviewPurposes00000",
    createdAt: "2026-04-18T10:00:00Z",
  },
  {
    id: "upd-plata-mia-2",
    projectId: "plata-mia-15ac43",
    body: "We're applying for the Web3 Foundation grant next month — if anyone in the cohort has experience with their application review process, would love a 20-minute call.",
    linkUrl: null,
    createdBy: "5MockWalletAddressRedactedForPreviewPurposes00000",
    createdAt: "2026-04-10T14:30:00Z",
  },
  {
    id: "upd-kleo-1",
    projectId: "kleo-protocol-53c76f",
    body: "First real loan originated on mainnet today. Small amount, but the whole flow — onboarding, scoring, disbursement, repayment — went through without us having to touch anything.",
    linkUrl: "https://kleo.finance/",
    createdBy: "5MockWalletAddressRedactedForPreviewPurposes00000",
    createdAt: "2026-04-15T09:20:00Z",
  },
];
