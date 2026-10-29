import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db.js', () => ({ supabase: { from: vi.fn() } }));
vi.mock('../../utils/id.js', () => ({ generateId: () => 'chai-ledger-1' }));

const { supabase } = await import('../../../db.js');
const submissionRepo = (await import('../program-submission.repository.js')).default;
const adminEmailRepo = (await import('../program-admin-email.repository.js')).default;

function makeChain(result) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: result, error: null })),
  };
  return chain;
}

const details = { track: 'both', testnetTxid: 'c'.repeat(64), anonymous: false };

describe('ProgramSubmissionRepository — tracked fields', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create writes details and the track column, and transform returns them', async () => {
    const row = { id: 'chai-ledger-1', program_id: 'fsh', luma_email: 'p@x.com', details, track: 'both', created_at: 't0' };
    const chain = makeChain(row);
    supabase.from.mockReturnValue(chain);
    const { submission } = await submissionRepo.create({
      programId: 'fsh', submitterName: 'P', lumaEmail: 'P@x.com', projectTitle: 'Chai', projectBrief: 'b',
      videoUrl: 'https://v', githubUrl: 'https://g', details,
    });
    expect(chain.insert.mock.calls[0][0]).toMatchObject({ details, track: 'both', luma_email: 'p@x.com' });
    expect(submission).toMatchObject({ details, track: 'both', createdAt: 't0' });
  });

  it('create without details (Bitrefill) writes nulls', async () => {
    const chain = makeChain({ id: 'x' });
    supabase.from.mockReturnValue(chain);
    await submissionRepo.create({ programId: 'b', submitterName: 'P', lumaEmail: 'p@x.com', projectTitle: 'T', projectBrief: 'b', videoUrl: 'https://v', githubUrl: 'https://g' });
    expect(chain.insert.mock.calls[0][0]).toMatchObject({ details: null, track: null });
  });

  it('a resubmit updates details and track but never created_at', async () => {
    const chain = makeChain({ id: 'x', details, track: 'both' });
    supabase.from.mockReturnValue(chain);
    await submissionRepo.updateSubmission('x', { submitterName: 'P', projectTitle: 'T', projectBrief: 'b', videoUrl: 'https://v', githubUrl: 'https://g', details });
    const patch = chain.update.mock.calls[0][0];
    expect(patch).toMatchObject({ details, track: 'both' });
    expect(patch).not.toHaveProperty('created_at');
  });
});

describe('ProgramAdminEmailRepository — judge profile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores name and tracks, lowercases the email, returns the profile', async () => {
    const chain = makeChain({ program_id: 'fsh', email: 'judge-a@example.com', role: 'judge', name: 'Judge A', tracks: ['privacy'] });
    supabase.from.mockReturnValue(chain);
    const g = await adminEmailRepo.add('fsh', 'Judge-A@Example.com', '5Admin', 'judge', { name: 'Judge A', tracks: ['privacy'] });
    const [row, opts] = chain.upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: 'program_id,email' });
    expect(row).toMatchObject({ email: 'judge-a@example.com', role: 'judge', name: 'Judge A', tracks: ['privacy'] });
    expect(g).toMatchObject({ email: 'judge-a@example.com', role: 'judge', name: 'Judge A', tracks: ['privacy'] });
  });

  it('a re-invite without a profile keeps the stored name and tracks', async () => {
    const chain = makeChain({ program_id: 'fsh', email: 'j@x.com', role: 'judge' });
    supabase.from.mockReturnValue(chain);
    await adminEmailRepo.add('fsh', 'j@x.com', '5Admin', 'judge');
    const row = chain.upsert.mock.calls[0][0];
    expect(row).not.toHaveProperty('name');
    expect(row).not.toHaveProperty('tracks');
  });
});

describe('SubmissionRefusalRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps known fields only, capped, never the honeypot; lowercases the email', async () => {
    const refusalRepo = (await import('../submission-refusal.repository.js')).default;
    const row = { id: 'r1', program_id: 'fsh', luma_email: 'sam@example.com', payload: {}, reason_code: 'not_checked_in', reason: 'x', status: 'refused', created_at: 't0' };
    const chain = makeChain(row);
    supabase.from.mockReturnValue(chain);
    const r = await refusalRepo.create({
      programId: 'fsh',
      body: { lumaEmail: ' Sam@Example.com ', projectTitle: 'T', projectBrief: 'b'.repeat(9000), company: 'spam', evil: 1, details: { track: 'privacy' } },
      reasonCode: 'not_checked_in',
      reason: 'x',
    });
    const ins = chain.insert.mock.calls[0][0];
    expect(ins.luma_email).toBe('sam@example.com');
    expect(ins.payload).not.toHaveProperty('company');
    expect(ins.payload).not.toHaveProperty('evil');
    expect(ins.payload.projectBrief).toHaveLength(5000);
    expect(ins.payload.details).toEqual({ track: 'privacy' });
    expect(r).toMatchObject({ id: 'r1', lumaEmail: 'sam@example.com', reasonCode: 'not_checked_in', status: 'refused', createdAt: 't0' });
  });

  it('create on program_submissions keeps an accepted attempt\'s time and source', async () => {
    const chain = makeChain({ id: 'x', created_at: '2026-11-04T14:20:00.000Z', accepted_from_refusal_id: 'r1' });
    supabase.from.mockReturnValue(chain);
    const { submission } = await submissionRepo.create({
      programId: 'fsh', submitterName: 'S', lumaEmail: 's@x.com', projectTitle: 'T', projectBrief: 'b', videoUrl: 'https://v', githubUrl: 'https://g',
      createdAt: '2026-11-04T14:20:00.000Z', acceptedFromRefusalId: 'r1',
    });
    expect(chain.insert.mock.calls[0][0]).toMatchObject({ created_at: '2026-11-04T14:20:00.000Z', accepted_from_refusal_id: 'r1' });
    expect(submission).toMatchObject({ createdAt: '2026-11-04T14:20:00.000Z', acceptedFromRefusalId: 'r1' });
  });
});
