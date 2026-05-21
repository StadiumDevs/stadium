import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../program-application.service.js', () => ({
  default: { listByProgram: vi.fn() },
}));
vi.mock('../program-signup.service.js', () => ({
  default: { listByProgramId: vi.fn() },
}));
vi.mock('../project.service.js', () => ({
  default: { getProjectById: vi.fn() },
}));

const applicationService = (await import('../program-application.service.js')).default;
const signupService = (await import('../program-signup.service.js')).default;
const projectService = (await import('../project.service.js')).default;
const { default: inboxService, inboxToCsv } = await import('../program-inbox.service.js');

beforeEach(() => vi.clearAllMocks());

describe('listInbox', () => {
  it('returns an empty array when there are no signups or applications', async () => {
    signupService.listByProgramId.mockResolvedValue([]);
    applicationService.listByProgram.mockResolvedValue([]);
    const out = await inboxService.listInbox('bitrefill-2026');
    expect(out).toEqual([]);
  });

  it('merges both sources and sorts newest first by `when`', async () => {
    signupService.listByProgramId.mockResolvedValue([
      { id: 's1', email: 'alice@x.com', name: 'Alice', registeredAt: '2026-05-10T00:00:00Z', wallet: '5A' },
      { id: 's2', email: 'bob@x.com', name: 'Bob', registeredAt: '2026-05-15T00:00:00Z' },
    ]);
    applicationService.listByProgram.mockResolvedValue([
      { id: 'a1', projectId: 'plata-mia', submittedAt: '2026-05-12T00:00:00Z', submittedBy: '5C', status: 'submitted' },
    ]);
    projectService.getProjectById.mockResolvedValue({ projectName: 'Plata Mia' });

    const out = await inboxService.listInbox('bitrefill-2026');
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ source: 'signup', identifier: 'bob@x.com' });          // 2026-05-15
    expect(out[1]).toMatchObject({ source: 'application', identifier: 'plata-mia' });     // 2026-05-12
    expect(out[2]).toMatchObject({ source: 'signup', identifier: 'alice@x.com' });        // 2026-05-10
  });

  it('enriches application rows with the project name (one fetch per unique projectId)', async () => {
    signupService.listByProgramId.mockResolvedValue([]);
    applicationService.listByProgram.mockResolvedValue([
      { id: 'a1', projectId: 'plata-mia', submittedAt: '2026-05-12T00:00:00Z', submittedBy: '5C', status: 'submitted' },
      { id: 'a2', projectId: 'plata-mia', submittedAt: '2026-05-13T00:00:00Z', submittedBy: '5C', status: 'submitted' },
    ]);
    projectService.getProjectById.mockResolvedValue({ projectName: 'Plata Mia' });

    const out = await inboxService.listInbox('bitrefill-2026');
    expect(out.every((e) => e.name === 'Plata Mia')).toBe(true);
    // Both entries share the projectId — service should only round-trip once.
    expect(projectService.getProjectById).toHaveBeenCalledTimes(1);
  });

  it('falls back to projectId when project lookup fails', async () => {
    signupService.listByProgramId.mockResolvedValue([]);
    applicationService.listByProgram.mockResolvedValue([
      { id: 'a1', projectId: 'missing-project', submittedAt: '2026-05-12T00:00:00Z', status: 'submitted' },
    ]);
    projectService.getProjectById.mockRejectedValue(new Error('not found'));

    const out = await inboxService.listInbox('bitrefill-2026');
    expect(out[0].name).toBe('missing-project');
  });
});

describe('inboxToCsv', () => {
  it('emits the header + each row + a slug stamp', () => {
    const csv = inboxToCsv(
      [
        {
          source: 'signup',
          when: '2026-05-10T00:00:00Z',
          identifier: 'alice@x.com',
          name: 'Alice',
          email: 'alice@x.com',
          status: null,
          wallet: '5A',
        },
      ],
      { programSlug: 'bitrefill-2026' },
    );
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('source,when,identifier,name,email,status,wallet');
    expect(lines[1]).toContain('alice@x.com');
    expect(lines.at(-1)).toMatch(/^# program=bitrefill-2026/);
  });

  it('quotes values containing commas, quotes, or newlines', () => {
    const csv = inboxToCsv([
      { source: 'application', when: '', identifier: 'p', name: 'Smith, Jr.', email: null, status: null, wallet: null },
      { source: 'application', when: '', identifier: 'q', name: 'has "quote"', email: null, status: null, wallet: null },
      { source: 'application', when: '', identifier: 'r', name: 'line\nbreak', email: null, status: null, wallet: null },
    ]);
    expect(csv).toContain('"Smith, Jr."');
    expect(csv).toContain('"has ""quote"""');
    expect(csv).toContain('"line\nbreak"');
  });

  it('neutralises CSV formula injection (=, +, -, @, tab, CR leading chars)', () => {
    // Any cell starting with one of these characters is auto-executed as a
    // formula by Excel / Google Sheets when the CSV is opened. The serialiser
    // must prefix such cells with a single quote so the formula stays inert.
    const csv = inboxToCsv([
      { source: 'signup', when: '', identifier: '=cmd|/c calc!A1', name: null, email: null, status: null, wallet: null },
      { source: 'signup', when: '', identifier: '+1234',         name: null, email: null, status: null, wallet: null },
      { source: 'signup', when: '', identifier: '-SUM(A1:A2)',   name: null, email: null, status: null, wallet: null },
      { source: 'signup', when: '', identifier: '@import',       name: null, email: null, status: null, wallet: null },
      { source: 'signup', when: '', identifier: '\thidden',      name: null, email: null, status: null, wallet: null },
    ]);
    // Each cell gets a leading apostrophe so the spreadsheet treats it as text.
    // RFC-4180 quoting only kicks in for cells containing `,` `"` `\n` `\r` —
    // none of these payloads contain those, so they appear unquoted with just
    // the apostrophe prefix.
    expect(csv).toContain("'=cmd|/c calc!A1");
    expect(csv).toContain("'+1234");
    expect(csv).toContain("'-SUM(A1:A2)");
    expect(csv).toContain("'@import");
    expect(csv).toContain("'\thidden");
  });

  it('leaves legitimate values that happen to contain `=` mid-string alone', () => {
    const csv = inboxToCsv([
      { source: 'signup', when: '', identifier: 'alice=bob@x.com', name: null, email: null, status: null, wallet: null },
    ]);
    // No leading quote — the `=` is not in the first position.
    expect(csv).toContain('alice=bob@x.com');
    expect(csv).not.toContain("'alice=bob");
  });
});
