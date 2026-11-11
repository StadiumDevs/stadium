// Prize payouts: which awards a winner is owed (with the production FSH award
// shapes), payout detail and tx hash validation, explorer links and the CSV.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../repositories/program-submission.repository.js', () => ({ default: {} }));
vi.mock('../../repositories/payout.repository.js', () => ({ default: {} }));

const { awardsFor, owesPayout, allPaid, validateDetails, validatePayment, explorerUrl, networksFor, payoutsCsv } = await import('../payout.service.js');
const { trackedProgramFor } = await import('../../constants/trackedPrograms.js');

const tracked = trackedProgramFor('free-society-hack-2026');
const payout = tracked.payout;
// Every network the service knows, to test each validator (FSH itself takes Ethereum only).
const allNetworks = { ...payout, networks: ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon', 'solana', 'polkadot-asset-hub'] };
// Test-only addresses: the zero/burn address, Solana's system program, the //Alice dev key.
const EVM = '0x000000000000000000000000000000000000dEaD';
const SOL = '11111111111111111111111111111111';
const DOT = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const TX = `0x${'ab'.repeat(32)}`;

const TOP = { amount: 1300, currency: 'USDC', label: 'Privacy: top prize' };
const ECO_TIER = { amount: 100, currency: 'USDC', label: 'Zcash ecosystem prize' };
const AGENTIC = { amount: 1000, currency: 'USD', label: 'Agentic Commerce: most innovative' };
const entry = (prizes, extra = {}) => ({ id: 's', prizes, ecosystemPrize: false, details: { track: 'privacy' }, ...extra });

describe('awardsFor (production award shapes, 10 Nov 2026)', () => {
  it('a Privacy podium prize is one WebZero award, due now', () => {
    expect(awardsFor(entry({ privacy: TOP }), tracked)).toEqual([
      { award: 'privacy', label: 'Privacy: top prize', amount: 1300, currency: 'USDC', paidBy: 'WebZero', payable: true, due: 'now' },
    ]);
  });

  it('the ecosystem tier plus the Ecosystem flag is ONE ecosystem award, due on the milestone', () => {
    const s = entry({ privacy: ECO_TIER }, { ecosystemPrize: true, details: { milestone: { payoutStatus: 'pending' } } });
    const a = awardsFor(s, tracked);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ award: 'ecosystem', amount: 100, currency: 'USDC', payable: true, due: 'on_milestone' });
  });

  it('the Ecosystem flag on a podium project adds a further 100 USDC award', () => {
    const s = entry({ privacy: TOP }, { ecosystemPrize: true, details: { milestone: { payoutStatus: 'pending' } } });
    expect(awardsFor(s, tracked).map((a) => [a.award, a.amount])).toEqual([
      ['privacy', 1300],
      ['ecosystem', 100],
    ]);
  });

  it('milestone released → due now; not completed → forfeited (and not owed)', () => {
    const base = { ecosystemPrize: true };
    expect(awardsFor(entry({ privacy: ECO_TIER }, { ...base, details: { milestone: { payoutStatus: 'released' } } }), tracked)[0].due).toBe('now');
    const lost = entry({ privacy: ECO_TIER }, { ...base, details: { milestone: { payoutStatus: 'not_completed' } } });
    expect(awardsFor(lost, tracked)[0].due).toBe('forfeited');
    expect(owesPayout(lost, tracked)).toBe(false);
  });

  it('Agentic prizes are listed as paid by Bitrefill and never owed here', () => {
    const s = entry({ agentic: AGENTIC });
    expect(awardsFor(s, tracked)[0]).toMatchObject({ award: 'agentic', paidBy: 'Bitrefill', payable: false });
    expect(owesPayout(s, tracked)).toBe(false);
  });

  it('no awards for a non-winner or a program without payouts', () => {
    expect(awardsFor(entry({}), tracked)).toEqual([]);
    expect(awardsFor(entry({ privacy: TOP }), { ...tracked, payout: undefined })).toEqual([]);
  });

  it('allPaid needs every owed WebZero award paid', () => {
    const awards = awardsFor(entry({ privacy: TOP }, { ecosystemPrize: true, details: { milestone: { payoutStatus: 'pending' } } }), tracked);
    expect(allPaid(awards, [{ award: 'privacy' }])).toBe(false);
    expect(allPaid(awards, [{ award: 'privacy' }, { award: 'ecosystem' }])).toBe(true);
    expect(allPaid(awardsFor(entry({ agentic: AGENTIC }), tracked), [])).toBe(false);
  });
});

describe('validateDetails', () => {
  const ok = { legalName: ' Ada Lovelace ', taxCountry: 'gb', network: 'ethereum', address: EVM, addressConfirm: EVM, confirmed: true };

  it('accepts and normalises valid details', () => {
    expect(validateDetails(ok, payout)).toEqual({ ok: true, value: { legalName: 'Ada Lovelace', taxCountry: 'GB', network: 'ethereum', address: EVM } });
  });

  it('FSH takes USDC on Ethereum only', () => {
    expect(payout.networks).toEqual(['ethereum']);
    const v = validateDetails({ ...ok, network: 'base' }, payout);
    expect(v.ok).toBe(false);
    expect(v.error).toContain('supported USDC network');
  });

  it.each([
    ['solana', SOL],
    ['polkadot-asset-hub', DOT],
    ['ethereum', EVM.toLowerCase()],
  ])('accepts a %s address', (network, address) => {
    expect(validateDetails({ ...ok, network, address, addressConfirm: address }, allNetworks).ok).toBe(true);
  });

  it.each([
    ['an EVM address on Solana', { network: 'solana', address: EVM, addressConfirm: EVM }, 'Solana address'],
    ['a short EVM address', { address: '0x1234', addressConfirm: '0x1234' }, 'Ethereum address'],
    ['a Solana address on Ethereum', { address: SOL, addressConfirm: SOL }, 'Ethereum address'],
    ['an unsupported network', { network: 'tron' }, 'supported USDC network'],
    ['mismatched confirmation', { addressConfirm: '0x000000000000000000000000000000000000beef' }, "don't match"],
    ['no confirmation tick', { confirmed: false }, 'double-checked'],
    ['no name', { legalName: '' }, 'legal name'],
    ['a bad country', { taxCountry: 'Britain' }, 'country'],
  ])('rejects %s', (_, patch, msg) => {
    const v = validateDetails({ ...ok, ...patch }, allNetworks);
    expect(v.ok).toBe(false);
    expect(v.error).toContain(msg);
  });
});

describe('validatePayment and explorer links', () => {
  it('EVM networks take a 0x + 64 hex hash and link to their explorer', () => {
    expect(validatePayment({ txHash: TX }, 'base')).toMatchObject({ ok: true, value: { txHash: TX, note: null } });
    expect(validatePayment({ txHash: '0x123' }, 'base').ok).toBe(false);
    expect(explorerUrl('base', TX)).toBe(`https://basescan.org/tx/${TX}`);
    expect(explorerUrl('ethereum', TX)).toBe(`https://etherscan.io/tx/${TX}`);
    expect(explorerUrl('polkadot-asset-hub', TX)).toBe(`https://assethub-polkadot.subscan.io/extrinsic/${TX}`);
  });

  it('Solana takes a base58 signature', () => {
    const sig = '1'.repeat(64);
    expect(validatePayment({ txHash: sig }, 'solana').ok).toBe(true);
    expect(validatePayment({ txHash: TX }, 'solana').ok).toBe(false);
    expect(explorerUrl('solana', sig)).toBe(`https://solscan.io/tx/${sig}`);
  });

  it('keeps a given date and rejects a bad one', () => {
    expect(validatePayment({ txHash: TX, paidAt: '2026-11-20' }, 'base').value.paidAt).toBe('2026-11-20T00:00:00.000Z');
    expect(validatePayment({ txHash: TX, paidAt: 'soon' }, 'base').ok).toBe(false);
  });

  it('networksFor lists the program networks with labels', () => {
    expect(networksFor(payout)).toEqual([{ id: 'ethereum', label: 'Ethereum', addressHint: '0x… (42 characters)' }]);
    expect(networksFor(allNetworks)[1]).toMatchObject({ id: 'base', label: 'Base' });
  });
});

describe('payoutsCsv', () => {
  it('one line per award; formulas neutralised', () => {
    const csv = payoutsCsv([
      {
        projectTitle: '=HYPERLINK("x")',
        submitterName: 'Ada',
        email: 'ada@example.com',
        details: { legalName: 'Ada L', taxCountry: 'GB', network: 'base', address: EVM },
        awards: [
          { award: 'privacy', label: 'Privacy: top prize', amount: 1300, currency: 'USDC', paidBy: 'WebZero', due: 'now', payment: { txHash: TX, txUrl: 'https://basescan.org/tx/x', network: 'base', address: EVM, paidAt: '2026-11-20T00:00:00.000Z' } },
          { award: 'ecosystem', label: 'Ecosystem Prize', amount: 100, currency: 'USDC', paidBy: 'WebZero', due: 'on_milestone', payment: null },
        ],
      },
    ]);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"tx_hash"'.replace(/"/g, ''));
    expect(lines[1].startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
    expect(lines[1]).toContain(TX);
    expect(lines[2]).toContain('"on_milestone"');
  });
});

describe('payout details stay out of other payloads', () => {
  it('only the payout service and controller read the payout repository', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const root = path.resolve(import.meta.dirname, '../..');
    const hits = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p);
        } else if (p.endsWith('.js') && /payout\.repository\.js['"]/.test(fs.readFileSync(p, 'utf8'))) {
          hits.push(path.relative(root, p));
        }
      }
    };
    walk(root);
    expect(hits.sort()).toEqual(['controllers/payout.controller.js', 'services/payout.service.js']);
  });
});
