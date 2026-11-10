// Prize payouts (tracked programs): types for the payout API, explorer links
// for the record-payment preview, and the playground (mock mode) store.
// The award rules mirror server/api/services/payout.service.js (awardsFor) and
// the config mirrors server/api/constants/trackedPrograms.js (payout).

import type { ApiTrackedSubmission } from "./api";

export type PayoutAwardKey = "privacy" | "agentic" | "ecosystem";
export type PayoutDue = "now" | "on_milestone" | "forfeited";

export type PayoutNetwork = { id: string; label: string; addressHint: string };

export type PayoutDetails = {
  submissionId: string;
  legalName: string;
  taxCountry: string;
  network: string;
  address: string;
  confirmedAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
};

export type PayoutPayment = {
  txHash?: string;
  txUrl: string | null;
  network: string;
  address?: string;
  paidAt: string;
  paidBy?: string | null;
  note?: string | null;
  notifiedAt?: string | null;
};

export type PayoutAward = {
  award: PayoutAwardKey;
  label: string;
  amount: number;
  currency: string;
  paidBy: string | null;
  payable: boolean;
  due: PayoutDue;
  payment: PayoutPayment | null;
};

/** The winner's own card. */
export type MyPayout = {
  submissionId: string;
  projectTitle: string;
  currency: string;
  deadline: string | null;
  networks: PayoutNetwork[];
  awards: PayoutAward[];
  details: PayoutDetails | null;
  locked: boolean;
};

export type PayoutRow = {
  submissionId: string;
  projectTitle: string;
  submitterName: string;
  email: string;
  awards: PayoutAward[];
  details: PayoutDetails | null;
  paid: boolean;
};

export type PayoutsTable = { currency: string; deadline: string | null; networks: PayoutNetwork[]; rows: PayoutRow[] };

export type PayoutDetailsInput = {
  legalName: string;
  taxCountry: string;
  network: string;
  address: string;
  addressConfirm?: string;
  confirmed?: boolean;
};

const EVM_TX = /^0x[0-9a-fA-F]{64}$/;
const evm = (label: string, explorer: string, addressHint = "0x… (42 characters)") => ({
  label,
  addressHint,
  isAddress: (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a),
  isTx: (h: string) => EVM_TX.test(h),
  txUrl: (h: string) => `${explorer}/tx/${h}`,
});
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

/** Network labels and explorer links (display only; the server validates). */
export const NETWORKS: Record<string, { label: string; addressHint: string; isAddress: (a: string) => boolean; isTx: (h: string) => boolean; txUrl: (h: string) => string }> = {
  ethereum: evm("Ethereum", "https://etherscan.io"),
  base: evm("Base", "https://basescan.org"),
  arbitrum: evm("Arbitrum One", "https://arbiscan.io"),
  optimism: evm("OP Mainnet", "https://optimistic.etherscan.io"),
  polygon: evm("Polygon PoS", "https://polygonscan.com"),
  solana: {
    label: "Solana",
    addressHint: "base58, 32–44 characters",
    isAddress: (a) => BASE58.test(a) && a.length >= 32 && a.length <= 44,
    isTx: (h) => BASE58.test(h) && h.length >= 64 && h.length <= 90,
    txUrl: (h) => `https://solscan.io/tx/${h}`,
  },
  "polkadot-asset-hub": {
    label: "Polkadot Asset Hub",
    addressHint: "SS58 address (starts with 1 on Polkadot)",
    isAddress: (a) => BASE58.test(a) && a.length >= 46 && a.length <= 48,
    isTx: (h) => EVM_TX.test(h),
    txUrl: (h) => `https://assethub-polkadot.subscan.io/extrinsic/${h}`,
  },
};

export const networkLabel = (id: string | null | undefined) => (id ? NETWORKS[id]?.label ?? id : "");
export const explorerUrl = (network: string, txHash: string) =>
  NETWORKS[network] && NETWORKS[network].isTx(txHash.trim()) ? NETWORKS[network].txUrl(txHash.trim()) : null;
export const shortAddress = (a: string) => (a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

export const AWARD_DUE_TEXT: Record<PayoutDue, string> = {
  now: "Due now",
  on_milestone: "Due on milestone completion",
  forfeited: "Milestone not completed: not paid",
};

// --- Playground (mock mode) -------------------------------------------------

type PayoutConfig = {
  currency: string;
  paidBy: Record<PayoutAwardKey, string>;
  ecosystemAmount: number;
  detailsDeadline: string;
  networks: string[];
  ecosystemTrack: "privacy";
  ecosystemLabel: string;
  prizePrefixes: Record<string, string>;
};

const CONFIG: Record<string, PayoutConfig> = {
  "free-society-hack-2026": {
    currency: "USDC",
    paidBy: { privacy: "WebZero", agentic: "Bitrefill", ecosystem: "WebZero" },
    ecosystemAmount: 100,
    detailsDeadline: "2026-11-19",
    networks: ["ethereum", "base", "arbitrum", "optimism", "polygon", "solana", "polkadot-asset-hub"],
    ecosystemTrack: "privacy",
    ecosystemLabel: "Ecosystem Prize",
    prizePrefixes: { privacy: "Privacy:", agentic: "Agentic Commerce:" },
  },
};

const networksOf = (c: PayoutConfig): PayoutNetwork[] =>
  c.networks.map((id) => ({ id, label: NETWORKS[id].label, addressHint: NETWORKS[id].addressHint }));

type AwardInput = Pick<ApiTrackedSubmission, "prizes" | "ecosystemPrize"> & { details?: { milestone?: { payoutStatus?: string } | null } | null };

function awardsOf(s: AwardInput, c: PayoutConfig): Omit<PayoutAward, "payment">[] {
  const out: Omit<PayoutAward, "payment">[] = [];
  const status = s.details?.milestone?.payoutStatus;
  const ecoDue: PayoutDue = status === "not_completed" ? "forfeited" : status === "released" ? "now" : "on_milestone";
  let ecoFromTier = false;
  for (const track of ["privacy", "agentic"] as const) {
    const tier = s.prizes?.[track];
    if (!tier) continue;
    const isEco = track === c.ecosystemTrack && !Object.values(c.prizePrefixes).some((p) => tier.label.startsWith(p));
    if (isEco) ecoFromTier = true;
    const award: PayoutAwardKey = isEco ? "ecosystem" : track;
    out.push({
      award,
      label: tier.label,
      amount: Number(tier.amount),
      currency: tier.currency || c.currency,
      paidBy: c.paidBy[award],
      payable: c.paidBy[award] === "WebZero",
      due: isEco ? ecoDue : "now",
    });
  }
  if (s.ecosystemPrize && !ecoFromTier) {
    out.push({ award: "ecosystem", label: c.ecosystemLabel, amount: c.ecosystemAmount, currency: c.currency, paidBy: c.paidBy.ecosystem, payable: true, due: ecoDue });
  }
  return out;
}

type MockPayment = PayoutPayment & { award: PayoutAwardKey; txHash: string };
type MockState = { details: Record<string, PayoutDetails>; payments: Record<string, MockPayment[]> };

const key = (slug: string) => `stadium_mock_payouts_${slug}_v1`;
let memory: Record<string, MockState> = {};
const read = (slug: string): MockState => {
  try {
    const raw = localStorage.getItem(key(slug));
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    /* fall back to memory */
  }
  return memory[slug] ?? { details: {}, payments: {} };
};
const write = (slug: string, s: MockState) => {
  memory = { ...memory, [slug]: s };
  try {
    localStorage.setItem(key(slug), JSON.stringify(s));
  } catch {
    /* memory only */
  }
};

class MockPayoutError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function validate(input: PayoutDetailsInput, c: PayoutConfig): Omit<PayoutDetails, "submissionId"> {
  const legalName = input.legalName?.trim();
  if (!legalName) throw new MockPayoutError("Your legal name is required (max 200 characters)", 400);
  const taxCountry = input.taxCountry?.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(taxCountry ?? "")) throw new MockPayoutError("Choose your country of tax residence", 400);
  if (!c.networks.includes(input.network)) throw new MockPayoutError("Choose a supported USDC network", 400);
  const n = NETWORKS[input.network];
  const address = input.address?.trim();
  if (!address || !n.isAddress(address)) throw new MockPayoutError(`That isn't a valid ${n.label} address (${n.addressHint})`, 400);
  if (input.addressConfirm !== undefined && input.addressConfirm.trim() !== address) throw new MockPayoutError("The two addresses don't match", 400);
  if (input.confirmed !== true) throw new MockPayoutError(`Confirm the address is on ${n.label} and that you've double-checked it`, 400);
  return { legalName, taxCountry: taxCountry!, network: input.network, address };
}

/** True when the program has prize payouts in Stadium. */
export const hasPayouts = (slug: string | undefined) => !!slug && !!CONFIG[slug];

/** True when WebZero pays this entry a prize that is still owed (shows the winner's payout card). */
export const hasPayablePrize = (slug: string | undefined, s: AwardInput) => {
  const c = slug ? CONFIG[slug] : undefined;
  return !!c && awardsOf(s, c).some((a) => a.payable && a.due !== "forfeited");
};

/** Playground payouts, backed by localStorage. `list` is mockTracked.list(slug). */
export const mockPayouts = {
  config: (slug: string) => CONFIG[slug] ?? null,

  table(slug: string, list: ApiTrackedSubmission[]): PayoutsTable {
    const c = CONFIG[slug];
    if (!c) throw new MockPayoutError("This program has no prize payouts", 404);
    const st = read(slug);
    const rows = list
      .filter((s) => !s.isTestEntry && (s.status ?? "submitted") === "submitted")
      .map((s) => ({ s, awards: awardsOf(s, c) }))
      .filter((x) => x.awards.length)
      .map(({ s, awards }) => {
        const pays = st.payments[s.id] ?? [];
        const owed = awards.filter((a) => a.payable && a.due !== "forfeited");
        return {
          submissionId: s.id,
          projectTitle: s.projectTitle,
          submitterName: s.submitterName,
          email: s.lumaEmail,
          awards: awards.map((a) => ({ ...a, payment: pays.find((p) => p.award === a.award) ?? null })),
          details: st.details[s.id] ?? null,
          paid: owed.length > 0 && owed.every((a) => pays.some((p) => p.award === a.award)),
        };
      });
    return { currency: c.currency, deadline: c.detailsDeadline, networks: networksOf(c), rows };
  },

  mine(slug: string, s: ApiTrackedSubmission): MyPayout {
    const c = CONFIG[slug];
    if (!c) throw new MockPayoutError("This program has no prize payouts", 404);
    const awards = awardsOf(s, c);
    if (!awards.some((a) => a.payable && a.due !== "forfeited")) throw new MockPayoutError("No prize to pay out for this entry", 404);
    const st = read(slug);
    const pays = st.payments[s.id] ?? [];
    return {
      submissionId: s.id,
      projectTitle: s.projectTitle,
      currency: c.currency,
      deadline: c.detailsDeadline,
      networks: networksOf(c),
      awards: awards.map((a) => ({ ...a, payment: pays.find((p) => p.award === a.award) ?? null })),
      details: st.details[s.id] ?? null,
      locked: pays.length > 0,
    };
  },

  saveDetails(slug: string, s: ApiTrackedSubmission, input: PayoutDetailsInput, by: string, asAdmin = false): PayoutDetails {
    const c = CONFIG[slug];
    if (!c) throw new MockPayoutError("This program has no prize payouts", 404);
    const st = read(slug);
    if (!asAdmin && (st.payments[s.id] ?? []).length) {
      throw new MockPayoutError("A payment has been sent to these details. Reply to the payout email to change them.", 409);
    }
    const v = validate(asAdmin ? { ...input, confirmed: true } : input, c);
    const at = new Date().toISOString();
    const details = { submissionId: s.id, ...v, confirmedAt: at, updatedAt: at, updatedBy: by };
    write(slug, { ...st, details: { ...st.details, [s.id]: details } });
    return details;
  },

  record(slug: string, s: ApiTrackedSubmission, award: PayoutAwardKey, input: { txHash: string; paidAt?: string; note?: string }, by: string) {
    const c = CONFIG[slug];
    if (!c) throw new MockPayoutError("This program has no prize payouts", 404);
    const a = awardsOf(s, c).find((x) => x.award === award);
    if (!a) throw new MockPayoutError("This entry has no such award", 404);
    if (!a.payable) throw new MockPayoutError(`${a.paidBy ?? "Another organiser"} pays this prize, not WebZero`, 409);
    if (a.due === "forfeited") throw new MockPayoutError("The milestone was not completed, so this prize is not paid", 409);
    const st = read(slug);
    const d = st.details[s.id];
    if (!d) throw new MockPayoutError("The winner has not sent payout details yet", 409);
    const pays = st.payments[s.id] ?? [];
    if (pays.some((p) => p.award === award)) throw new MockPayoutError("This award is already marked paid. Undo it first to record a different payment.", 409);
    const txHash = input.txHash.trim();
    const txUrl = explorerUrl(d.network, txHash);
    if (!txUrl) throw new MockPayoutError(`That isn't a valid ${networkLabel(d.network)} transaction hash`, 400);
    const payment: MockPayment = {
      award,
      txHash,
      txUrl,
      network: d.network,
      address: d.address,
      paidAt: input.paidAt ? new Date(input.paidAt).toISOString() : new Date().toISOString(),
      paidBy: by,
      note: input.note?.trim() || null,
      notifiedAt: null,
    };
    write(slug, { ...st, payments: { ...st.payments, [s.id]: [...pays, payment] } });
    return payment;
  },

  undo(slug: string, submissionId: string, award: PayoutAwardKey) {
    const st = read(slug);
    const pays = st.payments[submissionId] ?? [];
    if (!pays.some((p) => p.award === award)) throw new MockPayoutError("No payment recorded for this award", 404);
    write(slug, { ...st, payments: { ...st.payments, [submissionId]: pays.filter((p) => p.award !== award) } });
  },
};

export { MockPayoutError };
