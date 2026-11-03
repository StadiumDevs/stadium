import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  notifySubmissionEvent,
  buildSubmissionEvent,
  submissionEventFor,
  contactFor,
} from '../submission-webhook.service.js';

const program = { id: 'fsh', slug: 'free-society-hack-2026', name: 'Free Society Hack' };
const submission = {
  id: 's1',
  projectTitle: 'Chai Ledger',
  submitterName: 'Priya',
  lumaEmail: 'priya@example.com',
  status: 'submitted',
  finalizedAt: '2026-11-04T13:00:00.000Z',
  details: {
    track: 'both',
    anonymous: false,
    contact: { app: 'telegram', handle: 'priya_x' },
    viewingKey: 'uviewtest1abc',
    team: [{ name: 'Arjun', email: 'arjun@example.com', role: 'backend' }, { name: 'Nisha', email: null, role: null }],
  },
  feedback: { agentEnv: 'Cursor' },
};

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  process.env.N8N_SUBMISSION_WEBHOOK_URL = 'https://n8n.example.com/webhook/stadium';
  process.env.N8N_WEBHOOK_SECRET = 'shh';
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.N8N_SUBMISSION_WEBHOOK_URL;
  delete process.env.N8N_WEBHOOK_SECRET;
});

describe('submissionEventFor', () => {
  it('maps each save to its event (a draft saved again sends none)', () => {
    expect(submissionEventFor({ existing: null, asDraft: true, finalizing: false })).toBe('submission.draft_created');
    expect(submissionEventFor({ existing: { status: 'draft' }, asDraft: true, finalizing: false })).toBeNull();
    expect(submissionEventFor({ existing: { status: 'draft' }, asDraft: false, finalizing: true })).toBe('submission.finalized');
    expect(submissionEventFor({ existing: null, asDraft: false, finalizing: true })).toBe('submission.finalized');
    expect(submissionEventFor({ existing: { status: 'submitted' }, asDraft: false, finalizing: false })).toBe('submission.updated');
  });
});

describe('notifySubmissionEvent', () => {
  it('sends nothing when the URL is unset', async () => {
    delete process.env.N8N_SUBMISSION_WEBHOOK_URL;
    expect(await notifySubmissionEvent('submission.finalized', { program, submission })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores unknown events', async () => {
    expect(await notifySubmissionEvent('submission.deleted', { program, submission })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs a signed JSON body with the event', async () => {
    const ok = await notifySubmissionEvent('submission.finalized', { program, submission, previousStatus: 'draft', editor: { name: 'Arjun' } });
    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://n8n.example.com/webhook/stadium');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Stadium-Event']).toBe('submission.finalized');
    expect(init.headers['X-Stadium-Secret']).toBe('shh');
    expect(init.headers['X-Stadium-Signature']).toBe(`sha256=${createHmac('sha256', 'shh').update(init.body).digest('hex')}`);
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      event: 'submission.finalized',
      program: { slug: 'free-society-hack-2026', name: 'Free Society Hack' },
      submission: { id: 's1', title: 'Chai Ledger', track: 'both', status: 'submitted', previousStatus: 'draft', pointPerson: 'Priya', batch: 'evening' },
      editedBy: 'Arjun',
      source: 'builder',
    });
    expect(body.adminUrl).toMatch(/\/admin\/programs\/free-society-hack-2026$/);
  });

  it('sends the whole team (point person first) and the Telegram contact', async () => {
    await notifySubmissionEvent('submission.updated', { program, submission });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.submission.team).toEqual([
      { name: 'Priya', email: 'priya@example.com', role: null, pointPerson: true },
      { name: 'Arjun', email: 'arjun@example.com', role: 'backend', pointPerson: false },
      { name: 'Nisha', email: null, role: null, pointPerson: false },
    ]);
    expect(body.submission.contact).toEqual({ app: 'telegram', handle: '@priya_x', url: 'https://t.me/priya_x' });
  });

  it('never sends the viewing key or the feedback', async () => {
    await notifySubmissionEvent('submission.updated', { program, submission });
    const raw = fetchMock.mock.calls[0][1].body;
    for (const secret of ['uviewtest', 'Cursor']) expect(raw).not.toContain(secret);
  });

  it('keeps real names for anonymous entries, flagged anonymous', () => {
    const anon = { ...submission, details: { ...submission.details, anonymous: true } };
    const body = buildSubmissionEvent('submission.finalized', { program, submission: anon, editor: { name: 'Arjun' } });
    expect(body.submission.anonymous).toBe(true);
    expect(body.submission.pointPerson).toBe('Priya');
    expect(body.editedBy).toBe('Arjun');
  });

  it('formats WhatsApp contacts and handles a missing one', () => {
    expect(contactFor({ app: 'whatsapp', handle: '+41 79 123 45 67' })).toEqual({ app: 'whatsapp', handle: '+41 79 123 45 67', url: 'https://wa.me/41791234567' });
    expect(contactFor({ app: 'telegram', handle: '@arjun_builds' }).url).toBe('https://t.me/arjun_builds');
    expect(contactFor(null)).toBeNull();
    const body = buildSubmissionEvent('submission.draft_created', { program, submission: { ...submission, details: { track: 'privacy' } } });
    expect(body.submission.contact).toBeNull();
    expect(body.submission.team).toHaveLength(1);
  });

  it('never throws when the receiver is down or slow', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(notifySubmissionEvent('submission.finalized', { program, submission })).resolves.toBe(false);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(notifySubmissionEvent('submission.finalized', { program, submission })).resolves.toBe(false);
  });

  it('sends no signature headers without a secret', async () => {
    delete process.env.N8N_WEBHOOK_SECRET;
    await notifySubmissionEvent('submission.draft_created', { program, submission });
    const { headers } = fetchMock.mock.calls[0][1];
    expect(headers).not.toHaveProperty('X-Stadium-Signature');
    expect(headers).not.toHaveProperty('X-Stadium-Secret');
  });
});
