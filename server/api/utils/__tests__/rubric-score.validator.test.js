import { describe, it, expect } from 'vitest';
import { validateRubricScore } from '../submission.validator.js';

describe('validateRubricScore', () => {
  it('accepts a partial privacy score (unscored criteria are null or absent)', () => {
    const v = validateRubricScore('privacy', { criteria: { works: 3, private: null }, notes: '  ok  ', session: 'evening' });
    expect(v).toEqual({ ok: true, value: { criteria: { works: 3, private: null }, notes: 'ok', session: 'evening' } });
  });

  it('accepts a full agentic score', () => {
    const v = validateRubricScore('agentic', { criteria: { requirements: 2, techStack: 5, innovation: 0 } });
    expect(v.ok).toBe(true);
    expect(v.value.session).toBeNull();
  });

  it('rejects an unknown track', () => {
    expect(validateRubricScore('bitcoin', { criteria: {} })).toEqual({ ok: false, error: 'Unknown track: bitcoin' });
  });

  it('rejects an unknown criterion', () => {
    expect(validateRubricScore('privacy', { criteria: { techStack: 2 } }).ok).toBe(false);
  });

  it('rejects out-of-range and non-integer values', () => {
    expect(validateRubricScore('privacy', { criteria: { works: 4 } }).ok).toBe(false);
    expect(validateRubricScore('privacy', { criteria: { bonus: 2 } }).ok).toBe(false);
    expect(validateRubricScore('privacy', { criteria: { works: 1.5 } }).ok).toBe(false);
    expect(validateRubricScore('privacy', { criteria: { works: -1 } }).ok).toBe(false);
    expect(validateRubricScore('privacy', { criteria: { works: '3' } }).ok).toBe(false);
  });

  it('rejects a missing criteria object', () => {
    expect(validateRubricScore('privacy', {}).ok).toBe(false);
    expect(validateRubricScore('privacy', { criteria: [1, 2] }).ok).toBe(false);
  });

  it('rejects notes over 5000 characters and a malformed session', () => {
    expect(validateRubricScore('privacy', { criteria: {}, notes: 'x'.repeat(5001) }).ok).toBe(false);
    expect(validateRubricScore('privacy', { criteria: {}, session: 'Evening Session!' }).ok).toBe(false);
  });
});
