import { describe, it, expect } from 'vitest';
import { submissionsToCsv } from '../submissions-csv.js';

const base = {
  createdAt: '2026-06-17T10:00:00.000Z',
  submitterName: 'Ada',
  lumaEmail: 'ada@example.com',
  projectTitle: 'Engine',
  projectBrief: 'A mechanical computer.',
  videoUrl: 'https://youtu.be/x',
  githubUrl: 'https://github.com/ada/x',
  late: false,
  agreedToTermsAt: '2026-06-17T10:00:00.000Z',
};

describe('submissionsToCsv', () => {
  it('emits a header with all feedback columns', () => {
    const csv = submissionsToCsv([]);
    const header = csv.split('\n')[0];
    for (const col of ['submitterName', 'lumaEmail', 'surfaces', 'surfacesPrimary', 'agentEnv', 'wouldKeepBuilding', 'eventLiked']) {
      expect(header).toContain(col);
    }
  });

  it('flattens the feedback survey (surfaces joined, string keys mapped)', () => {
    const csv = submissionsToCsv([
      { ...base, feedback: { surfaces: ['MCP', 'API'], surfacesPrimary: 'MCP', agentEnv: 'cursor', wouldKeepBuilding: 'yes' } },
    ]);
    const row = csv.split('\n')[1];
    expect(row).toContain('ada@example.com');
    expect(row).toContain('MCP; API');
    expect(row).toContain('cursor');
    expect(row).toContain('yes');
  });

  it('handles a submission with no feedback (blank feedback cells)', () => {
    const csv = submissionsToCsv([{ ...base, feedback: null }]);
    const row = csv.split('\n')[1];
    expect(row).toContain('Engine');
    // trailing feedback columns are empty, then the status column
    expect(row.endsWith(',,,,,,,submitted')).toBe(true);
  });

  it('adds a status column: submitted, draft, or abandoned once closed', () => {
    const rows = (closed) =>
      submissionsToCsv([{ ...base }, { ...base, status: 'draft' }], { submissionsClosed: closed }).split('\n');
    expect(rows(false)[0].endsWith(',status')).toBe(true);
    expect(rows(false)[1].endsWith(',submitted')).toBe(true);
    expect(rows(false)[2].endsWith(',draft')).toBe(true);
    expect(rows(true)[2].endsWith(',abandoned')).toBe(true);
  });

  it('neutralizes spreadsheet formula injection in feedback text', () => {
    const csv = submissionsToCsv([
      { ...base, feedback: { biggestBlocker: '=WEBSERVICE("http://evil")' } },
    ]);
    expect(csv).toContain("'=WEBSERVICE"); // leading quote sentinel from csvCell
  });

  it('stamps a self-identifying trailing comment', () => {
    const csv = submissionsToCsv([{ ...base, feedback: null }], { programSlug: 'bitrefill-2026' });
    expect(csv).toContain('# program=bitrefill-2026');
  });
});
