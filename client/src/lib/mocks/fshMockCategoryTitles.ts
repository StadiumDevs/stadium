// Playground only: the mock Free Society Hack projects (freeSocietyHack.seed.ts)
// have made-up titles, so they get categories here. Merged into the real
// category map only when VITE_USE_MOCK_DATA is on. "Hushbox" is left out on
// purpose so the admin preview shows an Uncategorized project.
import type { SubmissionCategory } from "../programStatsConfig";

const MOCK_TITLES: Record<string, string[]> = {
  "agent-guardrails": ["Zec Allowance", "Agent Wallet Guard", "Tab Settler"],
  "private-shopping": ["Ticket Veil", "Roam Topup", "Gift Concierge", "Bill Pilot", "Lightning Pantry"],
  "rewards-payroll": ["Quiet Payroll", "Tip Jar SDK", "Private Donations Widget", "ZK Payslip", "Reward Drops", "Commission Loop"],
  "merchant-payments": ["Chai Ledger", "Orchard Receipts", "ZecSplit", "Shielded Escrow", "Merchant QR Kit"],
  "trading-crosschain": ["Remittance Relay", "Border Value Router"],
  proofs: ["Proof of Age Pass", "Anonymous Feedback Box", "Ballot Shield", "Proof of Reserves Lite"],
  "wallet-network": ["Memo Mailbox", "Unified Address Book", "Viewing Key Vault"],
  "devtools-education": ["Shielded Faucet Bot", "Lightwalletd Health Monitor", "Testnet Explorer Lite"],
};

export const withMockTitles = (categories: SubmissionCategory[]): SubmissionCategory[] =>
  import.meta.env.VITE_USE_MOCK_DATA === "true"
    ? categories.map((c) => ({ ...c, titles: [...c.titles, ...(MOCK_TITLES[c.id] ?? [])] }))
    : categories;
