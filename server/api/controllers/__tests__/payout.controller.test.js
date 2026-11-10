// Prize payouts: the winner sends their own details (point person, verified
// email, results published); platform admins list, record payments (tx hash,
// emails the winner, syncs `paid`), undo, and email payout links.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: {
    findById: vi.fn(),
    listByProgramId: vi.fn(async () => []),
    setPaid: vi.fn(async (id, paid) => ({ id, paid })),
    updateTracked: vi.fn(async (id, x) => ({ id, ...x })),
  },
}));
vi.mock('../../repositories/payout.repository.js', () => ({
  default: {
    getDetails: vi.fn(async () => null),
    listDetails: vi.fn(async () => []),
    upsertDetails: vi.fn(async (submissionId, v) => ({ submissionId, ...v })),
    listPayments: vi.fn(async () => []),
    createPayment: vi.fn(async (p) => ({ id: 'pay1', notifiedAt: null, ...p })),
    markNotified: vi.fn(async () => {}),
    deletePayment: vi.fn(async () => null),
  },
}));
vi.mock('../../auth/supabaseUser.js', () => ({ extractSupabaseToken: vi.fn(), getSupabaseUser: vi.fn() }));
vi.mock('../../services/email-transport.js', () => ({ getEmailTransport: vi.fn() }));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const programService = (await import('../../services/program.service.js')).default;
const submissionRepo = (await import('../../repositories/program-submission.repository.js')).default;
const payoutRepo = (await import('../../repositories/payout.repository.js')).default;
const supa = await import('../../auth/supabaseUser.js');
const { getEmailTransport } = await import('../../services/email-transport.js');
const auditLog = (await import('../../services/program-audit-log.service.js')).default;
const controller = (await import('../payout.controller.js')).default;

const SLUG = 'free-society-hack-2026';
const FSH = { id: 'fsh', slug: SLUG, name: 'Free Society Hack', resultsPublishedAt: '2026-11-08T00:00:00Z' };
const ADMIN = { isGlobalAdmin: true, address: '5Admin', chain: 'polkadot' };
const PROGRAM_ADMIN = { isGlobalAdmin: false, address: '5ProgAdmin', role: 'admin' };
const EVM = '0x000000000000000000000000000000000000dEaD';
const TX = `0x${'ab'.repeat(32)}`;
const TOP = { amount: 1300, currency: 'USDC', label: 'Privacy: top prize' };
const ECO_TIER = { amount: 100, currency: 'USDC', label: 'Zcash ecosystem prize' };

const winner = (extra = {}) => ({
  id: 'w1',
  programId: 'fsh',
  projectTitle: 'Zeno',
  submitterName: 'Ada',
  lumaEmail: 'ada@example.com',
  status: 'submitted',
  details: { track: 'privacy', pitch: 'x', milestone: null },
  prizes: { privacy: TOP },
  ecosystemPrize: false,
  paid: false,
  ...extra,
});
const DETAILS = { submissionId: 'w1', legalName: 'Ada L', taxCountry: 'GB', network: 'base', address: EVM };
const BODY = { legalName: 'Ada L', taxCountry: 'GB', network: 'base', address: EVM, addressConfirm: EVM, confirmed: true };

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.send = vi.fn(() => res);
  res.setHeader = vi.fn();
  return res;
};
const call = async (fn, { params = {}, body = {}, user } = {}) => {
  const res = mockRes();
  await controller[fn]({ params: { slug: SLUG, submissionId: 'w1', ...params }, body, user, headers: {} }, res);
  return res;
};
const signedInAs = (email, extra = {}) => {
  supa.extractSupabaseToken.mockReturnValue('tok');
  supa.getSupabaseUser.mockResolvedValue({ email, emailConfirmed: true, ...extra });
};
const transport = { send: vi.fn(async () => ({ id: 'e1' })) };

beforeEach(() => {
  vi.clearAllMocks();
  programService.findBySlug.mockResolvedValue(FSH);
  submissionRepo.findById.mockResolvedValue(winner());
  supa.extractSupabaseToken.mockReturnValue(null);
  supa.getSupabaseUser.mockResolvedValue(null);
  getEmailTransport.mockResolvedValue(transport);
  payoutRepo.getDetails.mockResolvedValue(null);
  payoutRepo.listPayments.mockResolvedValue([]);
});

describe('winner: own payout details', () => {
  it('needs the verified point person email', async () => {
    let res = await call('getMine');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].code).toBe('verify_email');

    signedInAs('someone@else.com');
    res = await call('saveMine', { body: BODY });
    expect(res.status).toHaveBeenCalledWith(401);

    signedInAs('ada@example.com', { emailConfirmed: false });
    res = await call('saveMine', { body: BODY });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(payoutRepo.upsertDetails).not.toHaveBeenCalled();
  });

  it('the point person reads the card: awards, networks, deadline, no payment yet', async () => {
    signedInAs('ADA@example.com');
    const res = await call('getMine');
    expect(res.status).toHaveBeenCalledWith(200);
    const d = res.json.mock.calls[0][0].data;
    expect(d.awards.map((a) => a.award)).toEqual(['privacy']);
    expect(d.deadline).toBe('2026-11-19');
    expect(d.networks.map((n) => n.id)).toContain('solana');
    expect(d.locked).toBe(false);
  });

  it('saves valid details and audits without the address', async () => {
    signedInAs('ada@example.com');
    const res = await call('saveMine', { body: BODY });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(payoutRepo.upsertDetails).toHaveBeenCalledWith('w1', { legalName: 'Ada L', taxCountry: 'GB', network: 'base', address: EVM }, { by: 'ada@example.com', email: 'ada@example.com' });
    const audit = auditLog.logSafe.mock.calls[0][0];
    expect(audit.action).toBe('payout.details_updated');
    expect(JSON.stringify(audit)).not.toContain(EVM);
  });

  it('rejects invalid details', async () => {
    signedInAs('ada@example.com');
    const res = await call('saveMine', { body: { ...BODY, network: 'solana' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(payoutRepo.upsertDetails).not.toHaveBeenCalled();
  });

  it('locks once a payment is recorded', async () => {
    signedInAs('ada@example.com');
    payoutRepo.listPayments.mockResolvedValue([{ award: 'privacy', network: 'base', txHash: TX }]);
    const res = await call('saveMine', { body: BODY });
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('404 for a non-winner, an Agentic-only winner, a test entry, or before results are published', async () => {
    signedInAs('ada@example.com');
    submissionRepo.findById.mockResolvedValue(winner({ prizes: {} }));
    expect((await call('getMine')).status).toHaveBeenCalledWith(404);
    submissionRepo.findById.mockResolvedValue(winner({ prizes: { agentic: { amount: 1000, currency: 'USD', label: 'Agentic Commerce: most innovative' } } }));
    expect((await call('getMine')).status).toHaveBeenCalledWith(404);
    submissionRepo.findById.mockResolvedValue(winner({ isTestEntry: true }));
    expect((await call('getMine')).status).toHaveBeenCalledWith(404);
    submissionRepo.findById.mockResolvedValue(winner());
    programService.findBySlug.mockResolvedValue({ ...FSH, resultsPublishedAt: null });
    expect((await call('getMine')).status).toHaveBeenCalledWith(404);
  });
});

describe('admin: platform admins only', () => {
  it.each(['list', 'csv', 'saveDetails', 'recordPayment', 'deletePayment', 'requestDetails'])('%s → 403 for a program admin', async (fn) => {
    const res = await call(fn, { user: PROGRAM_ADMIN, params: { award: 'privacy' }, body: { txHash: TX } });
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('list returns winners with details and payment status', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([winner(), winner({ id: 'n1', prizes: {} })]);
    payoutRepo.listDetails.mockResolvedValue([DETAILS]);
    payoutRepo.listPayments.mockResolvedValue([{ submissionId: 'w1', award: 'privacy', network: 'base', address: EVM, txHash: TX, paidAt: 'x' }]);
    const res = await call('list', { user: ADMIN });
    const { rows } = res.json.mock.calls[0][0].data;
    expect(rows.map((r) => r.submissionId)).toEqual(['w1']);
    expect(rows[0].details.address).toBe(EVM);
    expect(rows[0].awards[0].payment.txUrl).toBe(`https://basescan.org/tx/${TX}`);
    expect(rows[0].paid).toBe(true);
  });
});

describe('admin: record a payment', () => {
  it('needs payout details first', async () => {
    const res = await call('recordPayment', { user: ADMIN, params: { award: 'privacy' }, body: { txHash: TX } });
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('snapshots the details, syncs paid, emails the winner once with the tx link', async () => {
    payoutRepo.getDetails.mockResolvedValue(DETAILS);
    payoutRepo.listPayments.mockResolvedValueOnce([]).mockResolvedValueOnce([{ award: 'privacy' }]);
    const res = await call('recordPayment', { user: ADMIN, params: { award: 'privacy' }, body: { txHash: TX } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(payoutRepo.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: 'w1', award: 'privacy', amount: 1300, currency: 'USDC', network: 'base', address: EVM, txHash: TX, paidBy: '5Admin' }),
    );
    expect(submissionRepo.setPaid).toHaveBeenCalledWith('w1', true, '5Admin');
    expect(transport.send).toHaveBeenCalledTimes(1);
    const mail = transport.send.mock.calls[0][0];
    expect(mail.to).toBe('ada@example.com');
    expect(mail.text).toContain(`https://basescan.org/tx/${TX}`);
    expect(payoutRepo.markNotified).toHaveBeenCalledWith('pay1');
    expect(res.json.mock.calls[0][0].data).toMatchObject({ paid: true, emailed: true });
    expect(auditLog.logSafe.mock.calls[0][0]).toMatchObject({ action: 'payout.paid', metadata: { award: 'privacy', txHash: TX } });
  });

  it('refuses a duplicate, a bad hash, an Agentic award and a forfeited ecosystem award', async () => {
    payoutRepo.getDetails.mockResolvedValue(DETAILS);
    payoutRepo.listPayments.mockResolvedValue([{ award: 'privacy' }]);
    expect((await call('recordPayment', { user: ADMIN, params: { award: 'privacy' }, body: { txHash: TX } })).status).toHaveBeenCalledWith(409);
    payoutRepo.listPayments.mockResolvedValue([]);
    expect((await call('recordPayment', { user: ADMIN, params: { award: 'privacy' }, body: { txHash: '0x12' } })).status).toHaveBeenCalledWith(400);
    submissionRepo.findById.mockResolvedValue(winner({ prizes: { agentic: { amount: 1000, currency: 'USD', label: 'Agentic Commerce: second' } } }));
    expect((await call('recordPayment', { user: ADMIN, params: { award: 'agentic' }, body: { txHash: TX } })).status).toHaveBeenCalledWith(409);
    submissionRepo.findById.mockResolvedValue(winner({ prizes: { privacy: ECO_TIER }, ecosystemPrize: true, details: { milestone: { payoutStatus: 'not_completed' } } }));
    expect((await call('recordPayment', { user: ADMIN, params: { award: 'ecosystem' }, body: { txHash: TX } })).status).toHaveBeenCalledWith(409);
    expect(payoutRepo.createPayment).not.toHaveBeenCalled();
  });

  it('an ecosystem payment releases the milestone payout', async () => {
    const ms = { sentence: 'x', payoutStatus: 'pending', payoutReleasedAt: null };
    submissionRepo.findById.mockResolvedValue(winner({ prizes: { privacy: ECO_TIER }, ecosystemPrize: true, details: { track: 'privacy', milestone: ms } }));
    payoutRepo.getDetails.mockResolvedValue(DETAILS);
    const res = await call('recordPayment', { user: ADMIN, params: { award: 'ecosystem' }, body: { txHash: TX, paidAt: '2026-12-11', notify: false } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.updateTracked).toHaveBeenCalledWith('w1', { milestone: { ...ms, payoutStatus: 'released', payoutReleasedAt: '2026-12-11T00:00:00.000Z' } });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('undo removes the payment and un-syncs paid', async () => {
    submissionRepo.findById.mockResolvedValue(winner({ paid: true }));
    payoutRepo.deletePayment.mockResolvedValue({ award: 'privacy', txHash: TX });
    const res = await call('deletePayment', { user: ADMIN, params: { award: 'privacy' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.setPaid).toHaveBeenCalledWith('w1', false, '5Admin');
    expect(auditLog.logSafe.mock.calls[0][0].action).toBe('payout.unpaid');
  });
});

describe('admin: email payout links', () => {
  it('emails only owed winners without details; never Agentic-only winners', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([
      winner(),
      winner({ id: 'w2', lumaEmail: 'b@example.com' }),
      winner({ id: 'g1', lumaEmail: 'g@example.com', prizes: { agentic: { amount: 800, currency: 'USD', label: 'Agentic Commerce: second' } } }),
    ]);
    payoutRepo.listDetails.mockResolvedValue([{ ...DETAILS, submissionId: 'w2' }]);
    const res = await call('requestDetails', { user: ADMIN });
    expect(res.json.mock.calls[0][0].data).toEqual({ sent: 1, failed: 0, eligible: 1 });
    expect(transport.send).toHaveBeenCalledTimes(1);
    const mail = transport.send.mock.calls[0][0];
    expect(mail.to).toBe('ada@example.com');
    expect(mail.text).toContain(`/programs/${SLUG}/projects/w1?payout=1`);
    expect(mail.text).toContain('Privacy: top prize, 1300 USDC');
  });

  it('refuses before results are published or without email configured', async () => {
    programService.findBySlug.mockResolvedValue({ ...FSH, resultsPublishedAt: null });
    expect((await call('requestDetails', { user: ADMIN })).status).toHaveBeenCalledWith(409);
    programService.findBySlug.mockResolvedValue(FSH);
    getEmailTransport.mockResolvedValue(null);
    expect((await call('requestDetails', { user: ADMIN })).status).toHaveBeenCalledWith(503);
  });
});
