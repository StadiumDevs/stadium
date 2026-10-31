import { describe, it, expect, vi } from 'vitest';

vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { updateTracked: vi.fn(async (id, x) => ({ id, details: { txCheck: x.txCheck } })) },
}));
const { checkTestnetTx, checkAndStore } = await import('../tx-check.service.js');
const repo = (await import('../../repositories/program-submission.repository.js')).default;

const TXID = 'ab'.repeat(31) + 'cd';
const proto = Buffer.from(TXID, 'hex').reverse();
const notFound = Object.assign(new Error('not found'), { code: 5 });
const unavailable = Object.assign(new Error('unavailable'), { code: 14 });
const block = (tx) => ({ vtx: [{ txid: Buffer.alloc(32), spends: [], outputs: [], actions: [] }, { txid: proto, spends: [], outputs: [], actions: [], ironwoodActions: [], ...tx }] });
const transport = ({ getTransaction, getBlock }) => ({
  getTransaction: vi.fn(getTransaction),
  getBlock: vi.fn(getBlock ?? (async () => block({}))),
});

describe('testnet tx check (lightwalletd)', () => {
  it('looks the txid up in protocol byte order and reads the shielded parts from its block', async () => {
    const t = transport({ getTransaction: async () => ({ height: 4554680 }), getBlock: async () => block({ ironwoodActions: [{}, {}] }) });
    const r = await checkTestnetTx(TXID, { transport: t, backoffMs: 0 });
    expect(r).toMatchObject({ status: 'verified', attempts: 1 });
    expect(t.getTransaction.mock.calls[0][0].equals(proto)).toBe(true);
    expect(t.getBlock).toHaveBeenCalledWith(4554680);
  });

  it('Orchard actions or Sapling outputs also count as shielded; none is not_shielded', async () => {
    for (const [tx, status] of [[{ actions: [{}] }, 'verified'], [{ outputs: [{}] }, 'verified'], [{}, 'not_shielded']]) {
      const t = transport({ getTransaction: async () => ({ height: 10 }), getBlock: async () => block(tx) });
      expect((await checkTestnetTx(TXID, { transport: t, backoffMs: 0 })).status).toBe(status);
    }
  });

  it('NOT_FOUND is not_found at once; a malformed txid never calls the server', async () => {
    const t = transport({ getTransaction: async () => { throw notFound; } });
    expect(await checkTestnetTx(TXID, { transport: t, backoffMs: 0 })).toMatchObject({ status: 'not_found', attempts: 1 });
    const t2 = transport({ getTransaction: async () => ({ height: 1 }) });
    expect((await checkTestnetTx('xyz', { transport: t2 })).status).toBe('not_found');
    expect(t2.getTransaction).not.toHaveBeenCalled();
  });

  it('retries when unreachable or not mined yet, then gives could_not_check (never a false not_found)', async () => {
    const t = transport({ getTransaction: async () => { throw unavailable; } });
    expect(await checkTestnetTx(TXID, { transport: t, backoffMs: 0 })).toMatchObject({ status: 'could_not_check', attempts: 3 });
    expect(t.getTransaction).toHaveBeenCalledTimes(3);
    const mempool = transport({ getTransaction: async () => ({ height: 0 }) });
    expect((await checkTestnetTx(TXID, { transport: mempool, backoffMs: 0 })).status).toBe('could_not_check');
    let n = 0;
    const flaky = transport({ getTransaction: async () => { n += 1; if (n === 1) throw unavailable; return { height: 5 }; }, getBlock: async () => block({ actions: [{}] }) });
    expect(await checkTestnetTx(TXID, { transport: flaky, backoffMs: 0 })).toMatchObject({ status: 'verified', attempts: 2 });
  });

  it('checkAndStore saves the result on the submission', async () => {
    const t = transport({ getTransaction: async () => ({ height: 5 }), getBlock: async () => block({ actions: [{}] }) });
    await checkAndStore('sub-1', TXID, { transport: t, backoffMs: 0 });
    expect(repo.updateTracked).toHaveBeenCalledWith('sub-1', { txCheck: expect.objectContaining({ status: 'verified' }) });
  });
});
