// Prize payouts for tracked programs: which awards a winner is owed, the
// payout details they send, and the payments admins record (tx hash = proof).
// Pure functions first; the loader at the end reads the program's rows.
//
// Awards are keyed by judged track ('privacy', 'agentic') or 'ecosystem'.
// A track prize whose tier has no track prefix ("Zcash ecosystem prize") is
// the Ecosystem Prize itself, so a project with that tier and the Ecosystem
// flag owes one award, not two. The Ecosystem flag on a podium project adds a
// further award (payout.ecosystemAmount). Awards another organiser pays
// (Agentic: Bitrefill) are listed but never collected or paid here.

import { isAddress as isEvmAddress } from 'viem';
import { decodeAddress, base58Decode } from '@polkadot/util-crypto';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import payoutRepository from '../repositories/payout.repository.js';
import { isCountedEntry } from '../constants/trackedPrograms.js';

const EVM_TX = /^0x[0-9a-fA-F]{64}$/;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

const isSolanaAddress = (a) => {
  if (!BASE58.test(a) || a.length < 32 || a.length > 44) return false;
  try {
    return base58Decode(a).length === 32;
  } catch {
    return false;
  }
};
const isSolanaSignature = (s) => {
  if (!BASE58.test(s) || s.length < 64 || s.length > 90) return false;
  try {
    return base58Decode(s).length === 64;
  } catch {
    return false;
  }
};
const isSs58 = (a) => {
  if (!BASE58.test(a)) return false;
  try {
    return decodeAddress(a).length === 32;
  } catch {
    return false;
  }
};
const evm = (label, explorer) => ({
  label,
  isAddress: (a) => isEvmAddress(a, { strict: false }),
  isTx: (h) => EVM_TX.test(h),
  txUrl: (h) => `${explorer}/tx/${h}`,
  addressHint: '0x… (42 characters)',
});

/** USDC networks a winner can choose. Explorer links are built from the tx hash. */
export const NETWORKS = {
  ethereum: evm('Ethereum', 'https://etherscan.io'),
  base: evm('Base', 'https://basescan.org'),
  arbitrum: evm('Arbitrum One', 'https://arbiscan.io'),
  optimism: evm('OP Mainnet', 'https://optimistic.etherscan.io'),
  polygon: evm('Polygon PoS', 'https://polygonscan.com'),
  solana: {
    label: 'Solana',
    isAddress: isSolanaAddress,
    isTx: isSolanaSignature,
    txUrl: (h) => `https://solscan.io/tx/${h}`,
    addressHint: 'base58, 32–44 characters',
  },
  'polkadot-asset-hub': {
    label: 'Polkadot Asset Hub',
    isAddress: isSs58,
    isTx: (h) => EVM_TX.test(h),
    txUrl: (h) => `https://assethub-polkadot.subscan.io/extrinsic/${h}`,
    addressHint: 'SS58 address (starts with 1 on Polkadot)',
  },
};

/** The networks a program accepts, as { id, label, addressHint }. */
export const networksFor = (payout) =>
  (payout?.networks ?? []).filter((id) => NETWORKS[id]).map((id) => ({ id, label: NETWORKS[id].label, addressHint: NETWORKS[id].addressHint }));

export const explorerUrl = (network, txHash) => (NETWORKS[network] && txHash ? NETWORKS[network].txUrl(txHash) : null);

const hasTrackPrefix = (label, prefixes) => Object.values(prefixes ?? {}).some((p) => String(label ?? '').startsWith(p));

/**
 * The awards a submission won, in display order:
 * [{ award, label, amount, currency, paidBy, payable, due }].
 * `payable`: WebZero pays it here. `due`: 'now', 'on_milestone' (Ecosystem
 * Prize, paid once the 30-day milestone is complete) or 'forfeited' (the
 * milestone was not completed).
 */
export function awardsFor(submission, tracked) {
  const payout = tracked?.payout;
  if (!payout) return [];
  const out = [];
  const ecoDue = () => {
    const status = submission.details?.milestone?.payoutStatus;
    return status === 'not_completed' ? 'forfeited' : status === 'released' ? 'now' : 'on_milestone';
  };
  let ecoFromTier = false;
  for (const track of tracked.judgedTracks ?? []) {
    const tier = submission.prizes?.[track];
    if (!tier) continue;
    const isEcoTier = track === tracked.ecosystem?.track && !hasTrackPrefix(tier.label, tracked.prizePrefixes);
    const award = isEcoTier ? 'ecosystem' : track;
    if (isEcoTier) ecoFromTier = true;
    const paidBy = payout.paidBy?.[award] ?? null;
    out.push({
      award,
      label: tier.label,
      amount: Number(tier.amount),
      currency: tier.currency || payout.currency,
      paidBy,
      payable: paidBy === 'WebZero',
      due: isEcoTier ? ecoDue() : 'now',
    });
  }
  if (submission.ecosystemPrize && !ecoFromTier) {
    const paidBy = payout.paidBy?.ecosystem ?? null;
    out.push({
      award: 'ecosystem',
      label: tracked.ecosystem?.label ?? 'Ecosystem Prize',
      amount: Number(payout.ecosystemAmount),
      currency: payout.currency,
      paidBy,
      payable: paidBy === 'WebZero',
      due: ecoDue(),
    });
  }
  return out;
}

/** True when WebZero owes this submission at least one award (it can send payout details). */
export const owesPayout = (submission, tracked) => awardsFor(submission, tracked).some((a) => a.payable && a.due !== 'forfeited');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Payout details from a winner or an admin. Returns { ok, value } or { ok, error }.
 * value: { legalName, taxCountry, network, address }.
 */
export function validateDetails(body, payout) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Payout details are required' };
  const legalName = str(body.legalName);
  if (!legalName || legalName.length > 200) return { ok: false, error: 'Your legal name is required (max 200 characters)' };
  const taxCountry = str(body.taxCountry).toUpperCase();
  if (!/^[A-Z]{2}$/.test(taxCountry)) return { ok: false, error: 'Choose your country of tax residence' };
  const network = str(body.network);
  if (!(payout?.networks ?? []).includes(network) || !NETWORKS[network]) return { ok: false, error: 'Choose a supported USDC network' };
  const address = str(body.address);
  if (!address || !NETWORKS[network].isAddress(address)) {
    return { ok: false, error: `That isn't a valid ${NETWORKS[network].label} address (${NETWORKS[network].addressHint})` };
  }
  if (body.addressConfirm !== undefined && str(body.addressConfirm) !== address) {
    return { ok: false, error: "The two addresses don't match" };
  }
  if (body.confirmed !== true) return { ok: false, error: `Confirm the address is on ${NETWORKS[network].label} and that you've double-checked it` };
  return { ok: true, value: { legalName, taxCountry, network, address } };
}

/** A payment record from an admin: { txHash, paidAt, note }. */
export function validatePayment(body, network) {
  const txHash = str(body?.txHash);
  if (!NETWORKS[network]) return { ok: false, error: 'The payout details have no supported network' };
  if (!NETWORKS[network].isTx(txHash)) return { ok: false, error: `That isn't a valid ${NETWORKS[network].label} transaction hash` };
  let paidAt = new Date().toISOString();
  if (body?.paidAt) {
    const t = Date.parse(body.paidAt);
    if (!Number.isFinite(t)) return { ok: false, error: 'paidAt must be a date' };
    paidAt = new Date(t).toISOString();
  }
  const note = str(body?.note);
  if (note.length > 500) return { ok: false, error: 'The note is max 500 characters' };
  return { ok: true, value: { txHash, paidAt, note: note || null } };
}

/** One award row with its payment, for the admin table and the winner's card. */
const awardRow = (a, payment) => ({
  ...a,
  payment: payment
    ? {
        txHash: payment.txHash,
        txUrl: explorerUrl(payment.network, payment.txHash),
        network: payment.network,
        address: payment.address,
        paidAt: payment.paidAt,
        paidBy: payment.paidBy,
        note: payment.note,
        notifiedAt: payment.notifiedAt,
      }
    : null,
});

/** True once every award WebZero pays (and that is still owed) has a payment. */
export const allPaid = (awards, payments) => {
  const owed = awards.filter((a) => a.payable && a.due !== 'forfeited');
  return owed.length > 0 && owed.every((a) => payments.some((p) => p.award === a.award));
};

/**
 * The admin payouts table: every winner (counted entries with an award),
 * their awards with payment status, and their details.
 */
export async function loadPayouts(program, tracked) {
  const all = await programSubmissionRepository.listByProgramId(program.id, { status: 'submitted' });
  const winners = all.filter((s) => isCountedEntry(s, tracked, program) && awardsFor(s, tracked).length);
  const ids = winners.map((s) => s.id);
  const [details, payments] = await Promise.all([payoutRepository.listDetails(ids), payoutRepository.listPayments(ids)]);
  const detailsBy = new Map(details.map((d) => [d.submissionId, d]));
  return winners.map((s) => {
    const mine = payments.filter((p) => p.submissionId === s.id);
    const awards = awardsFor(s, tracked);
    return {
      submissionId: s.id,
      projectTitle: s.projectTitle,
      submitterName: s.submitterName,
      email: s.lumaEmail,
      awards: awards.map((a) => awardRow(a, mine.find((p) => p.award === a.award))),
      details: detailsBy.get(s.id) ?? null,
      paid: allPaid(awards, mine),
    };
  });
}

/** CSV for accounting: one line per award. */
export function payoutsCsv(rows) {
  const cell = (v) => {
    const s = v == null ? '' : String(v);
    // Neutralise spreadsheet formulas, then quote.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const head = ['project', 'point_person', 'email', 'award', 'label', 'amount', 'currency', 'paid_by', 'due', 'legal_name', 'tax_country', 'network', 'address', 'tx_hash', 'tx_url', 'paid_at'];
  const lines = [head.join(',')];
  for (const r of rows) {
    for (const a of r.awards) {
      lines.push(
        [
          r.projectTitle,
          r.submitterName,
          r.email,
          a.award,
          a.label,
          a.amount,
          a.currency,
          a.paidBy,
          a.due,
          r.details?.legalName,
          r.details?.taxCountry,
          a.payment?.network ?? r.details?.network,
          a.payment?.address ?? r.details?.address,
          a.payment?.txHash,
          a.payment?.txUrl,
          a.payment?.paidAt,
        ]
          .map(cell)
          .join(','),
      );
    }
  }
  return `${lines.join('\n')}\n`;
}
