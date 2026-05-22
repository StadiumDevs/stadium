import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/program-signup.repository.js', () => ({
  default: { listByProgramId: vi.fn() },
}));

const signupRepository = (await import('../../repositories/program-signup.repository.js')).default;
const signupService = (await import('../program-signup.service.js')).default;

const signup = (raw, name = null) => ({ id: Math.random().toString(36), email: 'x@y.z', name, rawRow: raw });

describe('ProgramSignupService.projectCardsByProgramId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns [] when there are no signups', async () => {
    signupRepository.listByProgramId.mockResolvedValue([]);
    expect(await signupService.projectCardsByProgramId('p1')).toEqual([]);
  });

  it('maps a builder-submission row to a public-safe card', async () => {
    signupRepository.listByProgramId.mockResolvedValue([
      signup(
        {
          'What did you build?': 'A zk proof-of-thought engine.',
          'GitHub or other repo URL': 'https://github.com/acme/pot',
          'README or project doc link': 'https://docs.google.com/d/abc',
          'Built with (tools)': 'Claude, Cursor, Codex',
          'Please provide your Telegram contact': '@secret_handle',
        },
        'Ada Lovelace',
      ),
    ]);
    const [card] = await signupService.projectCardsByProgramId('p1');
    expect(card).toEqual({
      name: 'Ada Lovelace',
      description: 'A zk proof-of-thought engine.',
      repoUrl: 'https://github.com/acme/pot',
      docsUrl: 'https://docs.google.com/d/abc',
      tags: ['Claude', 'Cursor', 'Codex'],
    });
  });

  it('never leaks PII columns (telegram/email/contact)', async () => {
    signupRepository.listByProgramId.mockResolvedValue([
      signup(
        {
          'What did you build?': 'Thing',
          'Telegram contact': '@handle',
          Email: 'real@person.com',
        },
        'Builder',
      ),
    ]);
    const [card] = await signupService.projectCardsByProgramId('p1');
    const blob = JSON.stringify(card);
    expect(blob).not.toContain('@handle');
    expect(blob).not.toContain('real@person.com');
  });

  it('drops non-URL repo/doc values and rows with no project signal', async () => {
    signupRepository.listByProgramId.mockResolvedValue([
      signup({ 'GitHub repo': 'N/A', 'README link': 'tbd' }, 'NoLinks'),
      signup({ 'What did you build?': 'Real one', 'GitHub repo': 'https://github.com/a/b' }, 'Real'),
    ]);
    const cards = await signupService.projectCardsByProgramId('p1');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ name: 'Real', repoUrl: 'https://github.com/a/b' });
  });

  it('falls back to "Untitled project" when no name is available', async () => {
    signupRepository.listByProgramId.mockResolvedValue([
      signup({ 'What did you build?': 'Anon build' }, null),
    ]);
    const [card] = await signupService.projectCardsByProgramId('p1');
    expect(card.name).toBe('Untitled project');
  });
});
