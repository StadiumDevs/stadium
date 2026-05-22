import { describe, it, expect, beforeEach } from 'vitest';
import service, { validateNonMemberApplication } from '../non-member-application.service.js';
import { mockResend } from './mock-resend.js';

describe('validateNonMemberApplication', () => {
  it('accepts a valid payload and trims fields', () => {
    const r = validateNonMemberApplication({ name: '  Ada  ', email: ' ada@x.com ', pitch: '  built X ' });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ name: 'Ada', email: 'ada@x.com', pitch: 'built X', walletAddress: '' });
  });

  it('rejects a missing name', () => {
    expect(validateNonMemberApplication({ email: 'a@b.co', pitch: 'x' })).toMatchObject({ ok: false });
  });

  it('rejects an invalid email', () => {
    expect(validateNonMemberApplication({ name: 'A', email: 'not-an-email', pitch: 'x' })).toMatchObject({ ok: false });
  });

  it('rejects a missing pitch', () => {
    expect(validateNonMemberApplication({ name: 'A', email: 'a@b.co' })).toMatchObject({ ok: false });
  });

  it('rejects an over-long pitch', () => {
    const r = validateNonMemberApplication({ name: 'A', email: 'a@b.co', pitch: 'x'.repeat(1001) });
    expect(r.ok).toBe(false);
  });
});

describe('NonMemberApplicationService.submit', () => {
  beforeEach(() => mockResend.send.mockClear());

  it('sends ONE email to info@ with sacha@ cc and applicant details in the body', async () => {
    const r = await service.submit({
      programName: 'PitchOff! Denver 2026',
      programSlug: 'pitchoff-2026-denver',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      pitch: 'I built a zk thing',
      walletAddress: '',
    });
    expect(r.ok).toBe(true);
    expect(mockResend.send).toHaveBeenCalledTimes(1);
    const arg = mockResend.send.mock.calls[0][0];
    expect(arg.to).toBe('info@joinwebzero.com');
    expect(arg.cc).toEqual(['sacha@joinwebzero.com']);
    expect(arg.subject).toContain('PitchOff! Denver 2026');
    expect(arg.text).toContain('ada@example.com');
    expect(arg.text).toContain('I built a zk thing');
  });

  it('escapes HTML in the applicant fields (no email HTML injection)', async () => {
    await service.submit({
      programName: 'P',
      programSlug: 'p',
      name: '<script>x</script>',
      email: 'a@b.co',
      pitch: 'hi <b>there</b>',
    });
    const arg = mockResend.send.mock.calls[0][0];
    expect(arg.html).not.toContain('<script>');
    expect(arg.html).toContain('&lt;script&gt;');
  });
});
