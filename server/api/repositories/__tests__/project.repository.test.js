import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db.js', () => ({
  supabase: { from: vi.fn() },
}));

const { supabase } = await import('../../../db.js');
const repo = (await import('../project.repository.js')).default;

function makeChain(overrides = {}) {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    ...overrides,
  };
  return chain;
}

describe('ProjectRepository.updateProject — bounty_prizes handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes then inserts bounty_prizes when bountyPrize is provided', async () => {
    // Chain 1: check project exists — returns existing row
    const existsChain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: { id: 'proj-1' }, error: null })),
    });

    // Chain 2: update the project main row (toSupabaseProject returns {} for no mapped fields)
    // The repo skips the .update() call when the row is empty, so we only need the related-table chains.

    // Chain 3: delete bounty_prizes
    const deleteBountyChain = makeChain();

    // Chain 4: insert bounty_prizes
    const insertBountyChain = makeChain({
      // insert resolves without error
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    });
    // insert on bounty_prizes chain just resolves
    insertBountyChain.insert = vi.fn(() => Promise.resolve({ error: null }));

    // Chain 5: getProjectById — second select call to re-fetch
    const refetchChain = makeChain({
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'proj-1',
            project_name: 'Test',
            description: 'desc',
            team_members: [],
            bounty_prizes: [
              { name: 'Main Track', amount: 5000, hackathon_won_at_id: 'hack-1' },
            ],
            milestones: [],
            payments: [],
          },
          error: null,
        })
      ),
    });

    supabase.from
      // 1. exists check
      .mockReturnValueOnce(existsChain)
      // 2. delete bounty_prizes
      .mockReturnValueOnce(deleteBountyChain)
      // 3. insert bounty_prizes
      .mockReturnValueOnce(insertBountyChain)
      // 4. getProjectById re-fetch (select *)
      .mockReturnValueOnce(refetchChain);

    await repo.updateProject('proj-1', {
      bountyPrize: [{ name: 'Main Track', amount: 5000, hackathonWonAtId: 'hack-1' }],
    });

    // delete must have been called with project_id = proj-1
    expect(deleteBountyChain.delete).toHaveBeenCalled();
    expect(deleteBountyChain.eq).toHaveBeenCalledWith('project_id', 'proj-1');

    // insert must have been called with the mapped snake_case row
    expect(insertBountyChain.insert).toHaveBeenCalledWith([
      { project_id: 'proj-1', name: 'Main Track', amount: 5000, hackathon_won_at_id: 'hack-1' },
    ]);
  });

  it('does NOT touch bounty_prizes when bountyPrize is absent from update data', async () => {
    // Chain 1: check project exists
    const existsChain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: { id: 'proj-1' }, error: null })),
    });

    // Chain 2: update project main row (projectName is provided, so update fires)
    const updateChain = makeChain();

    // Chain 3: getProjectById re-fetch
    const refetchChain = makeChain({
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'proj-1',
            project_name: 'Updated Name',
            description: 'desc',
            team_members: [],
            bounty_prizes: [
              { name: 'Existing Prize', amount: 1000, hackathon_won_at_id: 'hack-2' },
            ],
            milestones: [],
            payments: [],
          },
          error: null,
        })
      ),
    });

    supabase.from
      .mockReturnValueOnce(existsChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(refetchChain);

    await repo.updateProject('proj-1', { projectName: 'Updated Name' });

    // Verify bounty_prizes table was never touched
    const allFromCalls = supabase.from.mock.calls.map((c) => c[0]);
    expect(allFromCalls).not.toContain('bounty_prizes');
  });
});

// Phase 1 multi-event reframe — #93. The transform exposes the joined
// `programs` row as `project.program`, alongside the legacy `hackathon`
// flat-column view.
describe('ProjectRepository — program / program_id (issue #93)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('surfaces project.program from the joined programs row', async () => {
    const chain = makeChain({
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'proj-1',
            project_name: 'Test',
            description: 'desc',
            hackathon_id: 'symbiosis-2025',
            hackathon_name: 'Symbiosis 2025',
            hackathon_end_date: '2025-11-19T23:00:00Z',
            program_id: 'symbiosis-2025',
            program: {
              id: 'symbiosis-2025',
              name: 'Symbiosis 2025',
              slug: 'symbiosis-2025',
              program_type: 'hackathon',
              status: 'completed',
              event_starts_at: null,
              event_ends_at: '2025-11-19T23:00:00Z',
              location: null,
            },
            team_members: [],
            bounty_prizes: [],
            milestones: [],
            payments: [],
          },
          error: null,
        })
      ),
    });
    supabase.from.mockReturnValueOnce(chain);

    const project = await repo.getProjectById('proj-1');

    expect(project.program).toEqual({
      id: 'symbiosis-2025',
      name: 'Symbiosis 2025',
      slug: 'symbiosis-2025',
      programType: 'hackathon',
      status: 'completed',
      eventStartsAt: null,
      eventEndsAt: '2025-11-19T23:00:00Z',
      location: null,
    });
    // Legacy hackathon shape is preserved for callers not yet migrated.
    expect(project.hackathon).toEqual({
      id: 'symbiosis-2025',
      name: 'Symbiosis 2025',
      endDate: '2025-11-19T23:00:00Z',
      eventStartedAt: undefined,
    });
  });

  it('returns project.program as null when no programs row is joined', async () => {
    const chain = makeChain({
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'proj-2',
            project_name: 'Legacy',
            description: 'desc',
            hackathon_id: 'symbiosis-2025',
            hackathon_name: 'Symbiosis 2025',
            hackathon_end_date: '2025-11-19T23:00:00Z',
            program_id: null,
            program: null,
            team_members: [],
            bounty_prizes: [],
            milestones: [],
            payments: [],
          },
          error: null,
        })
      ),
    });
    supabase.from.mockReturnValueOnce(chain);

    const project = await repo.getProjectById('proj-2');

    expect(project.program).toBeNull();
    // Legacy hackathon view still works.
    expect(project.hackathon.id).toBe('symbiosis-2025');
  });

  it('maps incoming program.id to program_id when updating a project', async () => {
    // Chain 1: exists check
    const existsChain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: { id: 'proj-3' }, error: null })),
    });
    // Chain 2: the update — capture the row passed to .update()
    const updateChain = makeChain();
    // Chain 3: re-fetch
    const refetchChain = makeChain({
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'proj-3',
            project_name: 'X',
            description: 'desc',
            program_id: 'bitrefill-2026',
            program: null,
            team_members: [],
            bounty_prizes: [],
            milestones: [],
            payments: [],
          },
          error: null,
        })
      ),
    });

    supabase.from
      .mockReturnValueOnce(existsChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(refetchChain);

    await repo.updateProject('proj-3', { program: { id: 'bitrefill-2026' } });

    expect(updateChain.update).toHaveBeenCalledWith({ program_id: 'bitrefill-2026' });
  });
});
