import type { ApiTxCheck, TxCheckStatus } from "./api";
import { MOCK_TX_RESULTS } from "./mocks/freeSocietyHack.seed";

/**
 * Zcash testnet transaction check (mock-mode stand-in for the planned server
 * lookup against a public lightwalletd such as testnet.zec.rocks).
 *
 * Only two things are checkable: the transaction exists, and it has Orchard
 * actions (it is shielded). Amounts and memos stay private. A lookup that keeps
 * failing returns `could_not_check` instead of a false "not found", because
 * public testnet servers are unreliable. Results are cached per txid.
 */

export const TX_CHECK_TOOLTIP =
  "Stadium looks the transaction up on a Zcash testnet lightwalletd server and checks two things: it exists, and it has Orchard actions (it is shielded). Amounts and memos stay private and are never checked. Use the explorer link to verify it yourself.";

const MAX_ATTEMPTS = 3;
const cache = new Map<string, ApiTxCheck>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One mock lookup. Throws to simulate a timeout.
const lookupOnce = async (txid: string): Promise<Exclude<TxCheckStatus, "could_not_check">> => {
  await sleep(150);
  const known = MOCK_TX_RESULTS[txid];
  if (known === "could_not_check") throw new Error("lightwalletd timeout");
  if (known) return known;
  // Unknown txids: a well-formed 64-hex id is treated as a shielded hit; anything else isn't found.
  return /^[0-9a-f]{64}$/i.test(txid) || txid.startsWith("MOCK-") ? "verified" : "not_found";
};

export async function checkTestnetTx(txid: string, opts: { force?: boolean } = {}): Promise<ApiTxCheck> {
  const key = txid.trim();
  if (!opts.force && cache.has(key)) return cache.get(key) as ApiTxCheck;
  let result: ApiTxCheck = { status: "could_not_check", checkedAt: new Date().toISOString(), attempts: MAX_ATTEMPTS };
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const status = await lookupOnce(key);
      result = { status, checkedAt: new Date().toISOString(), attempts: attempt };
      break;
    } catch {
      if (attempt < MAX_ATTEMPTS) await sleep(200 * attempt);
    }
  }
  cache.set(key, result);
  return result;
}
