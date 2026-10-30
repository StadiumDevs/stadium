// Zcash testnet transaction check for tracked programs (Free Society Hack).
// Two things are checkable: the transaction exists on chain, and it has
// shielded parts (Sapling spends/outputs, Orchard or Ironwood actions).
// Amounts and memos stay private and are never read.
//
// Source: a public lightwalletd (default testnet.zec.rocks:443).
// GetTransaction proves it exists and gives its block height; the compact
// block at that height lists each transaction's shielded parts, so the raw
// transaction never needs parsing (NU7 / Ironwood formats included).
//
// The check never blocks a submission: it runs after the response, retries
// transient failures, and stores `could_not_check` rather than a false
// `not_found` when the server can't be reached.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import programSubmissionRepository from '../repositories/program-submission.repository.js';

const LIGHTWALLETD = process.env.TX_CHECK_LIGHTWALLETD || 'testnet.zec.rocks:443';
const MAX_ATTEMPTS = 3;
const DEADLINE_MS = 15000;
const TXID_RE = /^[0-9a-f]{64}$/i;
const GRPC_NOT_FOUND = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A retryable failure (server unreachable, tx not mined yet). */
class TransientError extends Error {}

let clientPromise = null;
// The real transport: a lazily created gRPC client.
async function grpcTransport() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const grpc = (await import('@grpc/grpc-js')).default;
      const loader = (await import('@grpc/proto-loader')).default;
      const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'proto', 'lightwalletd');
      const def = loader.loadSync(['service.proto'], { includeDirs: [dir], longs: Number, bytes: Buffer, defaults: true });
      const pkg = grpc.loadPackageDefinition(def).cash.z.wallet.sdk.rpc;
      return new pkg.CompactTxStreamer(LIGHTWALLETD, grpc.credentials.createSsl());
    })();
  }
  const client = await clientPromise;
  const call = (method, arg) =>
    new Promise((resolve, reject) =>
      client[method](arg, { deadline: Date.now() + DEADLINE_MS }, (err, res) => (err ? reject(err) : resolve(res))),
    );
  return {
    // hash: the txid bytes in protocol order (the display hex reversed).
    getTransaction: (hash) => call('GetTransaction', { hash }),
    getBlock: (height) => call('GetBlock', { height }),
  };
}

const isShielded = (tx) =>
  (tx.spends?.length ?? 0) + (tx.outputs?.length ?? 0) + (tx.actions?.length ?? 0) + (tx.ironwoodActions?.length ?? 0) > 0;

/** One lookup. Returns 'verified' | 'not_found' | 'not_shielded', or throws TransientError. */
export async function lookupOnce(txid, transport) {
  const protoOrder = Buffer.from(txid, 'hex').reverse();
  let raw;
  try {
    raw = await transport.getTransaction(protoOrder);
  } catch (err) {
    if (err?.code === GRPC_NOT_FOUND) return 'not_found';
    throw new TransientError(err?.message || 'lightwalletd unavailable');
  }
  const height = Number(raw?.height ?? 0);
  // In the mempool (not mined yet): try again later.
  if (!height) throw new TransientError('not mined yet');
  let block;
  try {
    block = await transport.getBlock(height);
  } catch (err) {
    throw new TransientError(err?.message || 'lightwalletd unavailable');
  }
  const tx = (block?.vtx ?? []).find((t) => Buffer.from(t.txid).equals(protoOrder));
  if (!tx) throw new TransientError('transaction not in the reported block');
  return isShielded(tx) ? 'verified' : 'not_shielded';
}

/**
 * Check a txid with retries. Never throws.
 * @returns {Promise<{status: string, checkedAt: string, attempts: number}>}
 */
export async function checkTestnetTx(txid, { transport, backoffMs = 1500 } = {}) {
  const key = String(txid || '').trim();
  const at = () => new Date().toISOString();
  if (!TXID_RE.test(key)) return { status: 'not_found', checkedAt: at(), attempts: 0 };
  let t = transport;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      t = t ?? (await grpcTransport());
      const status = await lookupOnce(key, t);
      return { status, checkedAt: at(), attempts: attempt };
    } catch (err) {
      if (!(err instanceof TransientError) && attempt === MAX_ATTEMPTS) break;
      if (attempt < MAX_ATTEMPTS) await sleep(backoffMs * attempt);
    }
  }
  return { status: 'could_not_check', checkedAt: at(), attempts: MAX_ATTEMPTS };
}

/** Check a submission's txid and store the result. Never throws (fire-and-forget). */
export async function checkAndStore(submissionId, txid, opts = {}) {
  try {
    const result = await checkTestnetTx(txid, opts);
    return await programSubmissionRepository.updateTracked(submissionId, { txCheck: result });
  } catch (err) {
    console.error('❌ Testnet tx check failed to store:', err);
    return null;
  }
}

export default { checkTestnetTx, checkAndStore, lookupOnce };
