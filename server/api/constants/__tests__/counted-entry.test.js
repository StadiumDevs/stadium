import { describe, it, expect } from 'vitest';
import { isCountedEntry, trackedProgramFor } from '../trackedPrograms.js';

describe('isCountedEntry', () => {
  const tracked = trackedProgramFor('free-society-hack-2026');
  const closed = { eventEndsAt: '2026-11-05T00:00:00Z' };
  const now = Date.parse('2026-11-09T00:00:00Z');

  it('excludes test entries and abandoned drafts, keeps everything else', () => {
    expect(isCountedEntry({ status: 'submitted' }, tracked, closed, now)).toBe(true);
    expect(isCountedEntry({ status: 'submitted', isTestEntry: true }, tracked, closed, now)).toBe(false);
    expect(isCountedEntry({ status: 'draft' }, tracked, closed, now)).toBe(false);
    expect(isCountedEntry({ status: 'draft' }, tracked, { eventEndsAt: '2027-01-01T00:00:00Z' }, now)).toBe(true);
  });
});
