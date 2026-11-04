import { describe, it, expect } from 'vitest';
import { batchFor, trackedProgramFor, submissionsClosed, isAbandoned } from '../trackedPrograms.js';

const batches = trackedProgramFor('free-society-hack-2026').judgingBatches;

describe('batchFor (evening = in by Wed 4 Nov 20:00 IST, morning = after)', () => {
  it('puts a submission up to 20:00:00 IST in the evening batch', () => {
    expect(batchFor(batches, '2026-11-04T19:30:00+05:30')).toBe('evening');
    expect(batchFor(batches, '2026-11-04T19:59:59+05:30')).toBe('evening');
    expect(batchFor(batches, '2026-11-04T20:00:00+05:30')).toBe('evening');
  });

  it('puts anything after 20:00 IST in the morning batch', () => {
    expect(batchFor(batches, '2026-11-04T20:00:01+05:30')).toBe('morning');
    expect(batchFor(batches, '2026-11-04T23:59:00+05:30')).toBe('morning');
    expect(batchFor(batches, '2026-11-05T00:30:00+05:30')).toBe('morning');
  });

  it('reads UTC timestamps (as stored by Postgres) correctly', () => {
    // 20:00 IST = 14:30 UTC
    expect(batchFor(batches, '2026-11-04T14:30:00.000Z')).toBe('evening');
    expect(batchFor(batches, '2026-11-04T14:30:01.000Z')).toBe('morning');
  });

  it('falls back to the last batch for a missing or bad time', () => {
    expect(batchFor(batches, null)).toBe('morning');
    expect(batchFor(batches, 'not a date')).toBe('morning');
    expect(batchFor([], '2026-11-04T10:00:00Z')).toBeNull();
  });

  it('only knows tracked programs', () => {
    expect(trackedProgramFor('bitrefill-2026')).toBeNull();
  });
});

describe('submissionsClosed', () => {
  const fsh = trackedProgramFor('free-society-hack-2026');
  const now = Date.parse('2026-11-05T12:00:00Z');

  it('stays open before the admin eventEndsAt', () => {
    expect(submissionsClosed(fsh, { eventEndsAt: '2026-11-06T00:00:00Z' }, now)).toBe(false);
  });

  it('closes once eventEndsAt has passed', () => {
    expect(submissionsClosed(fsh, { eventEndsAt: '2026-11-05T11:59:59Z' }, now)).toBe(true);
    expect(submissionsClosed(fsh, { eventEndsAt: '2026-11-05T12:00:00Z' }, now)).toBe(true);
  });

  it('stays open when no end date is set', () => {
    expect(submissionsClosed(fsh, { eventEndsAt: null }, now)).toBe(false);
    expect(submissionsClosed(fsh, null, now)).toBe(false);
  });

  it('never closes an untracked program', () => {
    expect(submissionsClosed(null, { eventEndsAt: '2000-01-01T00:00:00Z' }, now)).toBe(false);
  });
});

describe('isAbandoned', () => {
  const fsh = trackedProgramFor('free-society-hack-2026');
  const program = { eventEndsAt: '2026-11-04T19:00:00Z' };
  const before = Date.parse('2026-11-04T18:00:00Z');
  const after = Date.parse('2026-11-04T19:00:01Z');

  it('a draft is abandoned only once submissions have closed', () => {
    expect(isAbandoned({ status: 'draft' }, fsh, program, before)).toBe(false);
    expect(isAbandoned({ status: 'draft' }, fsh, program, after)).toBe(true);
  });

  it('a finalized entry is never abandoned', () => {
    expect(isAbandoned({ status: 'submitted' }, fsh, program, after)).toBe(false);
  });

  it('untracked programs have no abandoned entries', () => {
    expect(isAbandoned({ status: 'draft' }, null, program, after)).toBe(false);
  });
});
