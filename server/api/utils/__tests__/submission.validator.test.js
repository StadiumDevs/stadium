import { describe, it, expect } from 'vitest';
import {
  validateSubmission,
  validateFeedback,
  validateRequiredSurvey,
  applyTrackedSurvey,
  validateExperienceRatings,
  validateScore,
  validatePrize,
  prizeTiersFor,
  DEFAULT_PRIZE_TIERS,
  MAX_TOTAL_SCORE,
} from '../submission.validator.js';

const goodFeedback = {
  surfaces: ['Hosted MCP', 'REST API'],
  surfacesPrimary: 'Hosted MCP',
  agentEnv: 'Claude Code',
  deadlineStatus: 'A purchase worked, but I handled (or mocked) the payment',
  biggestBlocker: 'The x402 flow',
  couldntHandle: '',
  wouldKeepBuilding: 'Maybe',
};

const goodSubmission = {
  submitterName: '  Ada Lovelace ',
  lumaEmail: 'Ada@Example.com',
  projectTitle: 'Analytical Engine',
  projectBrief: '  A general-purpose mechanical computer. It runs programs from punched cards.  ',
  videoUrl: 'https://youtu.be/demo',
  githubUrl: 'https://github.com/ada/engine',
  ratings: { overall: 4, organisation: 5, support: 4, tools: 3 },
};

describe('validateSubmission', () => {
  it('accepts a well-formed submission and trims fields', () => {
    const r = validateSubmission(goodSubmission);
    expect(r.ok).toBe(true);
    expect(r.value.submitterName).toBe('Ada Lovelace');
    expect(r.value.projectTitle).toBe('Analytical Engine');
    expect(r.value.projectBrief).toBe('A general-purpose mechanical computer. It runs programs from punched cards.');
  });

  it('rejects a missing name', () => {
    expect(validateSubmission({ ...goodSubmission, submitterName: '   ' }).ok).toBe(false);
  });

  it('rejects a missing brief', () => {
    expect(validateSubmission({ ...goodSubmission, projectBrief: '   ' }).ok).toBe(false);
  });

  it('rejects an overly long brief', () => {
    expect(validateSubmission({ ...goodSubmission, projectBrief: 'x'.repeat(501) }).ok).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(validateSubmission({ ...goodSubmission, lumaEmail: 'not-an-email' }).ok).toBe(false);
  });

  it('rejects non-http video / github urls', () => {
    expect(validateSubmission({ ...goodSubmission, videoUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(validateSubmission({ ...goodSubmission, githubUrl: 'ftp://x/y' }).ok).toBe(false);
    expect(validateSubmission({ ...goodSubmission, githubUrl: 'not a url' }).ok).toBe(false);
  });

  it('adds https:// to a link typed without a scheme (phones)', () => {
    const v = validateSubmission({ ...goodSubmission, githubUrl: 'github.com/no-scheme' });
    expect(v.ok).toBe(true);
    expect(v.value.githubUrl).toBe('https://github.com/no-scheme');
  });

  it('defaults feedback to null and agreedToTerms to false when absent', () => {
    const r = validateSubmission(goodSubmission);
    expect(r.ok).toBe(true);
    expect(r.value.feedback).toBe(null);
    expect(r.value.agreedToTerms).toBe(false);
  });

  it('carries valid feedback + terms agreement through', () => {
    const r = validateSubmission({ ...goodSubmission, feedback: goodFeedback, agreedToTerms: true });
    expect(r.ok).toBe(true);
    expect(r.value.feedback.surfaces).toEqual(['Hosted MCP', 'REST API']);
    expect(r.value.feedback.surfacesPrimary).toBe('Hosted MCP');
    expect(r.value.agreedToTerms).toBe(true);
  });

  it('rejects a submission whose feedback is malformed', () => {
    const r = validateSubmission({
      ...goodSubmission,
      feedback: { surfaces: ['MCP'], surfacesPrimary: 'CLI' },
    });
    expect(r.ok).toBe(false);
  });

  it('treats any non-true agreedToTerms as false', () => {
    expect(validateSubmission({ ...goodSubmission, agreedToTerms: 'yes' }).value.agreedToTerms).toBe(false);
  });
});

describe('validateFeedback', () => {
  it('returns null value when feedback is absent', () => {
    expect(validateFeedback(undefined)).toEqual({ ok: true, value: null });
    expect(validateFeedback(null)).toEqual({ ok: true, value: null });
  });

  it('rejects a non-object feedback', () => {
    expect(validateFeedback('nope').ok).toBe(false);
    expect(validateFeedback(['a']).ok).toBe(false);
  });

  it('normalizes a valid feedback object', () => {
    const r = validateFeedback(goodFeedback);
    expect(r.ok).toBe(true);
    expect(r.value.surfaces).toEqual(['Hosted MCP', 'REST API']);
    expect(r.value.surfacesPrimary).toBe('Hosted MCP');
    expect(r.value.agentEnv).toBe('Claude Code');
  });

  it('rejects a primary surface that is not among the selected surfaces', () => {
    expect(validateFeedback({ surfaces: ['MCP'], surfacesPrimary: 'CLI' }).ok).toBe(false);
  });

  it('rejects non-array surfaces and empty surface entries', () => {
    expect(validateFeedback({ surfaces: 'MCP' }).ok).toBe(false);
    expect(validateFeedback({ surfaces: ['  '] }).ok).toBe(false);
  });

  it('drops unknown keys rather than persisting them', () => {
    const r = validateFeedback({ ...goodFeedback, secretField: 'x' });
    expect(r.ok).toBe(true);
    expect(r.value.secretField).toBeUndefined();
  });

  it('rejects an over-long free-text answer', () => {
    expect(validateFeedback({ couldntHandle: 'x'.repeat(1001) }).ok).toBe(false);
  });
});

describe('validateRequiredSurvey', () => {
  const full = {
    surfaces: ['CLI', 'REST API'],
    surfacesPrimary: 'CLI',
    agentEnv: 'Claude Code',
    deadlineStatus: 'Search/pricing worked, never completed a buy',
    biggestBlocker: 'Access / keys / OAuth',
    couldntHandle: '',
    wouldKeepBuilding: 'No',
  };

  it('passes a complete survey (the one-line answer is optional)', () => {
    expect(validateRequiredSurvey(full).ok).toBe(true);
  });

  it('fails when nothing was given', () => {
    expect(validateRequiredSurvey(null).ok).toBe(false);
    expect(validateRequiredSurvey(undefined).ok).toBe(false);
  });

  it('fails without surfaces, or without a starred one from the selection', () => {
    expect(validateRequiredSurvey({ ...full, surfaces: [] }).ok).toBe(false);
    expect(validateRequiredSurvey({ ...full, surfacesPrimary: null }).ok).toBe(false);
    expect(validateRequiredSurvey({ ...full, surfacesPrimary: 'Hosted MCP' }).ok).toBe(false);
  });

  it.each(['agentEnv', 'deadlineStatus', 'biggestBlocker', 'wouldKeepBuilding'])('fails without %s', (key) => {
    expect(validateRequiredSurvey({ ...full, [key]: '' }).ok).toBe(false);
    expect(validateRequiredSurvey({ ...full, [key]: '   ' }).ok).toBe(false);
  });
});

describe('applyTrackedSurvey', () => {
  const config = { bitrefillSurveyTracks: ['agentic', 'both'] };
  const fb = { surfaces: ['CLI'], surfacesPrimary: 'CLI', agentEnv: 'Cursor', deadlineStatus: 'x', biggestBlocker: 'y', couldntHandle: '', wouldKeepBuilding: 'Maybe' };

  it('drops the survey for other tracks', () => {
    const value = { feedback: fb };
    expect(applyTrackedSurvey(config, 'privacy', value, { sent: true }).ok).toBe(true);
    expect(value.feedback).toBeNull();
  });

  it('requires it to finalize a survey track; a stored one counts', () => {
    expect(applyTrackedSurvey(config, 'agentic', { feedback: null }, { sent: false }).ok).toBe(false);
    const value = { feedback: null };
    expect(applyTrackedSurvey(config, 'both', value, { sent: false, stored: fb }).ok).toBe(true);
    expect(value).not.toHaveProperty('feedback');
  });

  it('a draft save with a blank survey keeps the stored answers', () => {
    const blank = { surfaces: [], surfacesPrimary: null, agentEnv: '', deadlineStatus: '', biggestBlocker: '', couldntHandle: '', wouldKeepBuilding: '' };
    const value = { feedback: blank };
    expect(applyTrackedSurvey(config, 'agentic', value, { sent: true, draft: true, stored: fb }).ok).toBe(true);
    expect(value).not.toHaveProperty('feedback');
    // A draft with real answers still replaces them.
    const partial = { feedback: { ...blank, agentEnv: 'Cursor' } };
    applyTrackedSurvey(config, 'agentic', partial, { sent: true, draft: true, stored: fb });
    expect(partial.feedback.agentEnv).toBe('Cursor');
  });

  it('lets a draft (or an entry with no track yet) through', () => {
    expect(applyTrackedSurvey(config, 'agentic', { feedback: null }, { sent: false, draft: true }).ok).toBe(true);
    expect(applyTrackedSurvey(config, null, { feedback: null }, { sent: false, draft: true }).ok).toBe(true);
  });

  it('is a no-op for programs without survey tracks', () => {
    const value = { feedback: fb };
    expect(applyTrackedSurvey({}, 'agentic', value, { sent: true }).ok).toBe(true);
    expect(value.feedback).toBe(fb);
  });
});

describe('validatePrize', () => {
  const tiers = [
    { amount: 500, currency: 'EUR', label: 'Bitrefill giftcard' },
    { amount: 100, currency: 'EUR', label: 'Bitrefill giftcard' },
  ];

  it('accepts an amount that matches a tier and snapshots its currency + label', () => {
    const r = validatePrize({ amount: 500 }, tiers);
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ amount: 500, currency: 'EUR', label: 'Bitrefill giftcard' });
  });

  it('clears the award when prize is explicitly null', () => {
    const r = validatePrize({ prize: null }, tiers);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(null);
  });

  it('rejects an amount not present in the tiers', () => {
    expect(validatePrize({ amount: 250 }, tiers).ok).toBe(false);
  });

  it('rejects a non-positive or non-integer amount', () => {
    expect(validatePrize({ amount: 0 }, tiers).ok).toBe(false);
    expect(validatePrize({ amount: -100 }, tiers).ok).toBe(false);
    expect(validatePrize({ amount: 50.5 }, tiers).ok).toBe(false);
    expect(validatePrize({ amount: '500' }, tiers).ok).toBe(false);
  });

  it('prizeTiersFor falls back to the default tiers when unset', () => {
    expect(prizeTiersFor({ prizeTiers: null })).toBe(DEFAULT_PRIZE_TIERS);
    expect(prizeTiersFor({ prizeTiers: [] })).toBe(DEFAULT_PRIZE_TIERS);
    expect(prizeTiersFor({ prizeTiers: tiers })).toBe(tiers);
  });
});

describe('validateScore', () => {
  it('accepts in-range integer scores', () => {
    const r = validateScore({ requirements: 2, techStack: 5, innovation: 4, notes: 'solid' });
    expect(r.ok).toBe(true);
    expect(r.value.notes).toBe('solid');
  });

  it('max total is 12', () => {
    expect(MAX_TOTAL_SCORE).toBe(12);
  });

  it('rejects out-of-range values', () => {
    expect(validateScore({ requirements: 3, techStack: 5, innovation: 5 }).ok).toBe(false); // req max 2
    expect(validateScore({ requirements: 2, techStack: 6, innovation: 5 }).ok).toBe(false); // tech max 5
    expect(validateScore({ requirements: 2, techStack: 5, innovation: -1 }).ok).toBe(false);
  });

  it('accepts in-range decimal scores, rounded to 1 decimal place', () => {
    const r = validateScore({ requirements: 1.5, techStack: 4.3, innovation: 5 });
    expect(r.ok).toBe(true);
    expect(r.value).toMatchObject({ requirements: 1.5, techStack: 4.3, innovation: 5 });
    // 4.34 rounds to 4.3 (matches NUMERIC(3,1) storage)
    expect(validateScore({ requirements: 0, techStack: 4.34, innovation: 0 }).value.techStack).toBe(4.3);
  });

  it('rejects non-numeric values', () => {
    expect(validateScore({ requirements: '2', techStack: 5, innovation: 5 }).ok).toBe(false);
    expect(validateScore({ requirements: NaN, techStack: 5, innovation: 5 }).ok).toBe(false);
    expect(validateScore({ techStack: 5, innovation: 5 }).ok).toBe(false); // missing requirements
  });

  it('rejects overly long notes', () => {
    expect(validateScore({ requirements: 1, techStack: 1, innovation: 1, notes: 'x'.repeat(5001) }).ok).toBe(false);
  });
});

describe('validateExperienceRatings', () => {
  const full = { overall: 4, organisation: 5, support: 1, tools: 3 };

  it('accepts every category scored 1 to 5', () => {
    expect(validateExperienceRatings(full)).toEqual({ ok: true, value: full });
  });

  it('rejects missing, out-of-range, fractional, string or unknown entries', () => {
    expect(validateExperienceRatings(undefined).ok).toBe(false);
    expect(validateExperienceRatings({ overall: 4 }).ok).toBe(false);
    expect(validateExperienceRatings({ ...full, overall: 0 }).ok).toBe(false);
    expect(validateExperienceRatings({ ...full, overall: 6 }).ok).toBe(false);
    expect(validateExperienceRatings({ ...full, overall: 3.5 }).ok).toBe(false);
    expect(validateExperienceRatings({ ...full, overall: '4' }).ok).toBe(false);
    expect(validateExperienceRatings({ ...full, vibes: 5 }).ok).toBe(false);
    expect(validateExperienceRatings([4, 4, 4, 4]).ok).toBe(false);
  });

  it('optional: absent is fine, but a present object must still be complete', () => {
    expect(validateExperienceRatings(null, { required: false })).toEqual({ ok: true, value: null });
    expect(validateExperienceRatings({ overall: 4 }, { required: false }).ok).toBe(false);
  });

  it('validateSubmission requires ratings unless ratingsOptional', () => {
    const { ratings, ...noRatings } = goodSubmission;
    expect(validateSubmission(goodSubmission).value.ratings).toEqual(ratings);
    const r = validateSubmission(noRatings);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/rate the event/i);
    const opt = validateSubmission(noRatings, { ratingsOptional: true });
    expect(opt.ok).toBe(true);
    expect(opt.value.ratings).toBeNull();
  });

  it('validateSubmission takes an optional, trimmed "what you liked" (max 500)', () => {
    expect(validateSubmission(goodSubmission).value.eventLiked).toBeNull();
    expect(validateSubmission({ ...goodSubmission, eventLiked: '   ' }).value.eventLiked).toBeNull();
    expect(validateSubmission({ ...goodSubmission, eventLiked: '  The mentors ' }).value.eventLiked).toBe('The mentors');
    expect(validateSubmission({ ...goodSubmission, eventLiked: 'x'.repeat(500) }).ok).toBe(true);
    const long = validateSubmission({ ...goodSubmission, eventLiked: 'x'.repeat(501) });
    expect(long.ok).toBe(false);
    expect(long.error).toMatch(/max 500/);
  });
});
