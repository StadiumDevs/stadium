import { describe, it, expect } from 'vitest';
import { batchFor, trackedProgramFor } from '../trackedPrograms.js';

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
