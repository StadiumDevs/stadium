import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../email-transport.js', () => ({ getEmailTransport: vi.fn() }));

const { getEmailTransport } = await import('../email-transport.js');
const service = (await import('../submission-confirmation.service.js')).default;

const BASE = {
  email: 'dana@builder.test',
  submitterName: 'Dana',
  programName: 'Bitrefill',
  slug: 'bitrefill-2026',
  projectTitle: 'PixelPay',
};

beforeEach(() => vi.clearAllMocks());

describe('submissionConfirmationService.send', () => {
  it('best-effort: returns provider_not_configured when the transport is null', async () => {
    getEmailTransport.mockResolvedValue(null);
    const r = await service.send(BASE);
    expect(r).toEqual({ ok: false, reason: 'provider_not_configured' });
  });

  it('sends to the submitter with a link to the program page', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'res_1' });
    getEmailTransport.mockResolvedValue({ send });
    const r = await service.send({ ...BASE, deadline: '2026-06-17T20:00:00.000Z' });
    expect(r).toEqual({ ok: true });
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe('dana@builder.test');
    expect(arg.html).toContain('/programs/bitrefill-2026');
    expect(arg.subject.toLowerCase()).toContain('received');
  });

  it('uses the "updated" wording on a resubmission', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'res_2' });
    getEmailTransport.mockResolvedValue({ send });
    await service.send({ ...BASE, resubmitted: true });
    const arg = send.mock.calls[0][0];
    expect(arg.subject.toLowerCase()).toContain('updated');
  });
});
