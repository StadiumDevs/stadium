import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchEligibleGuests } from '../luma.client.js';

// One page of guests: approved + checked in, approved only, pending, declined.
const PAGE = {
  entries: [
    { email: 'a@x.io', approval_status: 'approved', checked_in_at: '2026-11-04T10:00:00Z' },
    { email: 'b@x.io', approval_status: 'approved' },
    { email: 'c@x.io', approval_status: 'pending_approval' },
    { email: 'd@x.io', approval_status: 'declined' },
  ],
  has_more: false,
  next_cursor: null,
};

describe('fetchEligibleGuests', () => {
  beforeEach(() => {
    process.env.LUMA_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => PAGE })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LUMA_API_KEY;
  });

  it('counts approved guests alongside the checked-in set', async () => {
    const r = await fetchEligibleGuests('evt-1', 'checked_in');
    expect(r.total).toBe(4);
    expect(r.approved).toBe(2);
    expect(r.eligible.map((g) => g.email)).toEqual(['a@x.io']);
  });

  it('approved gate mode lets approved guests through; the approved count is unchanged', async () => {
    const r = await fetchEligibleGuests('evt-1', 'approved');
    expect(r.approved).toBe(2);
    expect(r.eligible.map((g) => g.email)).toEqual(['a@x.io', 'b@x.io']);
  });
});
