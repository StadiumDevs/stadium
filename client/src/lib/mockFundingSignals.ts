/**
 * Mock fixture for `project_funding_signals`. Seeded for a couple of projects
 * so the badge renders in preview mode; other projects fall through to the
 * default `is_seeking: false` shape returned by the API.
 *
 * Phase 1 revamp, issue #42.
 */

import type { ApiFundingSignal } from "./api";

export const mockFundingSignals: Record<string, ApiFundingSignal> = {
  "plata-mia-15ac43": {
    projectId: "plata-mia-15ac43",
    isSeeking: true,
    fundingType: "grant",
    amountRange: "30k–60k USD",
    description:
      "Applying for the Web3 Foundation grant to extend the stealth-transfer primitives beyond Asset Hub — happy to chat with anyone who's been through that review.",
    updatedBy: "mock-wallet",
    updatedAt: "2026-04-18T12:00:00Z",
  },
  "kleo-protocol-53c76f": {
    projectId: "kleo-protocol-53c76f",
    isSeeking: true,
    fundingType: "seed",
    amountRange: "200k-500k USD",
    description: "Opening a seed round this quarter to take Kleo to mainnet in LATAM.",
    updatedBy: "mock-wallet",
    updatedAt: "2026-04-15T09:20:00Z",
  },
};
