import { describe, it, expect } from 'vitest';
import { renderEmail } from '../index.js';

const base = { submitterName: 'Priya', programName: 'Free Society Hack', projectTitle: 'Chai <Ledger>', link: 'https://x/programs/fsh' };

describe('submission emails', () => {
  it('a tracked confirmation lists what was submitted and how to update (verify)', () => {
    const e = renderEmail('submission_confirmation', {
      ...base,
      details: { track: 'privacy', pitch: 'Checkout.', testnetTxid: 'a'.repeat(64), nextStep: 'Pilot.' },
    });
    expect(e.text).toContain('Track: Privacy');
    expect(e.text).toContain(`Testnet transaction: ${'a'.repeat(64)}`);
    expect(e.text).toContain('Update my submission');
    expect(e.html).toContain('Chai &lt;Ledger&gt;');
  });

  it('an untracked confirmation keeps the old resubmit wording', () => {
    const e = renderEmail('submission_confirmation', base);
    expect(e.text).toContain('submit again with this same email');
    expect(e.text).not.toContain('Track:');
  });

  it('the pending-review email says an organiser will confirm', () => {
    const e = renderEmail('submission_pending_review', base);
    expect(e.subject).toBe('Your submission to Free Society Hack is waiting for approval');
    expect(e.text).toContain('an organiser will confirm it');
  });
});
