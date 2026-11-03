import { describe, it, expect } from 'vitest';
import { toPublicSubmission, toPublicList } from '../public-submission.js';

const row = (details = {}) => ({
  id: 's1',
  projectTitle: 'Chai',
  projectBrief: 'Shielded checkout',
  submitterName: 'Arjun',
  lumaEmail: 'arjun@example.com',
  videoUrl: 'https://youtu.be/x',
  githubUrl: 'https://github.com/a/b',
  createdAt: '2026-11-01T10:00:00Z',
  details: {
    track: 'privacy',
    testnetTxid: 'a'.repeat(64),
    viewingKey: 'uviewtest1' + 'q'.repeat(80),
    birthHeight: 3100000,
    bitrefillFeedback: { worked: 'x', didnt: 'y' },
    contact: { app: 'telegram', handle: 'arjun_builds' },
    team: [{ name: 'Mira', email: 'mira@example.com', role: 'backend' }],
    ...details,
  },
});

describe('toPublicSubmission', () => {
  it('never exposes the viewing key or birth height (they reveal the wallet history)', () => {
    const p = toPublicSubmission(row());
    expect(p.details).not.toHaveProperty('viewingKey');
    expect(p.details).not.toHaveProperty('birthHeight');
    expect(JSON.stringify(p)).not.toContain('uviewtest');
    // The txid stays public: it's the evidence shown with the badge.
    expect(p.details.testnetTxid).toBe('a'.repeat(64));
  });

  it('still hides the Bitrefill feedback and emails', () => {
    const p = toPublicSubmission(row());
    expect(p.details).not.toHaveProperty('bitrefillFeedback');
    expect(JSON.stringify(p)).not.toContain('@example.com');
  });

  it('never exposes the Telegram / WhatsApp contact (admins only)', () => {
    const p = toPublicSubmission(row(), { published: true });
    expect(p.details).not.toHaveProperty('contact');
    expect(JSON.stringify(p)).not.toContain('arjun_builds');
  });

  it('applies to every row of the public list', () => {
    const list = toPublicList([row(), row({ viewingKey: 'uviewtest1zz' })], false);
    expect(JSON.stringify(list)).not.toContain('uviewtest');
  });
});
