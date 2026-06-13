import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../email-transport.js', () => ({ getEmailTransport: vi.fn() }));
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { listWinnersToNotify: vi.fn(), setPrizeNotified: vi.fn() },
}));

const { getEmailTransport } = await import('../email-transport.js');
const repo = (await import('../../repositories/program-submission.repository.js')).default;
const service = (await import('../prize-award.service.js')).default;

const PROGRAM = { id: 'prog-1', name: 'Bitrefill', slug: 'bitrefill-2026' };
const WINNER = {
  id: 's1',
  lumaEmail: 'winner@x.com',
  submitterName: 'Win',
  projectTitle: 'PixelPay',
  prizeAmount: 500,
  prizeCurrency: 'EUR',
  prizeLabel: 'Bitrefill giftcard',
};

beforeEach(() => vi.clearAllMocks());

describe('prizeAwardService.notifyWinners', () => {
  it('best-effort: provider_not_configured when the transport is null (no DB read)', async () => {
    getEmailTransport.mockResolvedValue(null);
    const r = await service.notifyWinners({ program: PROGRAM });
    expect(r).toMatchObject({ ok: false, reason: 'provider_not_configured' });
    expect(repo.listWinnersToNotify).not.toHaveBeenCalled();
  });

  it('emails each un-notified winner with prize details + results link, then stamps notified', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'res_1' });
    getEmailTransport.mockResolvedValue({ send });
    repo.listWinnersToNotify.mockResolvedValue([WINNER]);
    repo.setPrizeNotified.mockResolvedValue({});

    const r = await service.notifyWinners({ program: PROGRAM });
    expect(r).toMatchObject({ ok: true, sent: 1, failed: 0 });

    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe('winner@x.com');
    expect(arg.subject).toContain('Bitrefill giftcard');
    expect(arg.html).toContain('/programs/bitrefill-2026');
    expect(repo.setPrizeNotified).toHaveBeenCalledWith('s1');
  });

  it('does NOT stamp notified when the send fails, so a later publish retries', async () => {
    const send = vi.fn().mockRejectedValue(new Error('domain not verified'));
    getEmailTransport.mockResolvedValue({ send });
    repo.listWinnersToNotify.mockResolvedValue([WINNER]);

    const r = await service.notifyWinners({ program: PROGRAM });
    expect(r).toMatchObject({ ok: true, sent: 0, failed: 1 });
    expect(repo.setPrizeNotified).not.toHaveBeenCalled();
  });
});
