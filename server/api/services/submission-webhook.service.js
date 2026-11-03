import { createHmac } from 'node:crypto';
import logger from '../utils/logger.js';
import { trackedProgramFor, batchFor } from '../constants/trackedPrograms.js';

// Outbound webhook (e.g. an n8n Webhook node) for submission events:
//   submission.draft_created  a team saved its first draft (tracked programs)
//   submission.finalized      a new entry, or a draft moved to submitted
//   submission.updated        a submitted entry was saved again
// Off unless N8N_SUBMISSION_WEBHOOK_URL is set. Best-effort: it never throws
// and never delays or fails a submission. The payload carries no emails, no
// demo-day contact, no viewing key and no feedback.
// Signed: X-Stadium-Signature = sha256=<HMAC-SHA256(N8N_WEBHOOK_SECRET, raw body)>.

export const SUBMISSION_EVENTS = ['submission.draft_created', 'submission.finalized', 'submission.updated'];
const TIMEOUT_MS = 3000;
const ANONYMOUS = 'Anonymous';

/** The payload sent for one event (exported for tests). */
export function buildSubmissionEvent(event, { program, submission, previousStatus = null, editor = null, source = 'builder', now = new Date() }) {
  const d = submission?.details || {};
  const anon = d.anonymous === true;
  const tracked = trackedProgramFor(program?.slug);
  const frontend = process.env.FRONTEND_URL || 'https://stadium.joinwebzero.com';
  return {
    event,
    occurredAt: now.toISOString(),
    program: { slug: program?.slug ?? null, name: program?.name ?? null },
    submission: {
      id: submission?.id ?? null,
      title: submission?.projectTitle ?? null,
      track: d.track ?? null,
      status: submission?.status ?? 'submitted',
      previousStatus,
      late: !!submission?.late,
      batch: tracked ? batchFor(tracked.judgingBatches, submission?.finalizedAt ?? submission?.createdAt ?? now.toISOString()) : null,
      anonymous: anon,
      pointPerson: anon ? ANONYMOUS : submission?.submitterName ?? null,
    },
    editedBy: anon ? ANONYMOUS : editor?.name ?? null,
    source,
    adminUrl: program?.slug ? `${frontend}/admin/programs/${program.slug}` : null,
  };
}

/** Send one event. Resolves to true when the receiver answered 2xx; never rejects. */
export async function notifySubmissionEvent(event, input) {
  const url = process.env.N8N_SUBMISSION_WEBHOOK_URL;
  if (!url || !SUBMISSION_EVENTS.includes(event)) return false;
  try {
    const body = JSON.stringify(buildSubmissionEvent(event, input));
    const secret = process.env.N8N_WEBHOOK_SECRET;
    const headers = { 'Content-Type': 'application/json', 'X-Stadium-Event': event };
    if (secret) {
      headers['X-Stadium-Signature'] = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
      headers['X-Stadium-Secret'] = secret;
    }
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) logger.warn(`submission webhook ${event} answered ${res.status}`);
    return res.ok;
  } catch (e) {
    logger.warn(`submission webhook ${event} failed: ${e?.message ?? e}`);
    return false;
  }
}

/**
 * Which event a submit produced, or null (a draft saved again sends nothing).
 * `existing`: the entry before this save; `asDraft`: saved as a draft;
 * `finalizing`: this save moved it to submitted (or created it submitted).
 */
export function submissionEventFor({ existing, asDraft, finalizing }) {
  if (asDraft) return existing ? null : 'submission.draft_created';
  if (finalizing) return 'submission.finalized';
  return existing ? 'submission.updated' : 'submission.finalized';
}

export default { notifySubmissionEvent, buildSubmissionEvent, submissionEventFor };
