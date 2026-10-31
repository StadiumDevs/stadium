import { escapeHtml } from './escape.js';

// A verified builder whose email isn't on the program's Luma checked-in list:
// the submission is held for an organiser to confirm (submission_refusals).

export function subject(payload) {
  return `Your submission to ${payload.programName} is waiting for approval`;
}

export function html(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com';
  return `<p>Thanks${payload.submitterName ? `, ${escapeHtml(payload.submitterName)}` : ''}! We received <strong>${escapeHtml(payload.projectTitle)}</strong> for <strong>${escapeHtml(payload.programName)}</strong>.</p>
<p>Your email isn't on the event's checked-in list yet, so an organiser will confirm it. Once they do, your project goes live with the time you submitted it. You don't need to submit again.</p>
<p>If you checked in with a different email, you can also submit again using that one.</p>
<p><a href="${escapeHtml(link)}">Open the program page</a></p>`;
}

export function text(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com';
  return `Thanks${payload.submitterName ? `, ${payload.submitterName}` : ''}! We received "${payload.projectTitle}" for ${payload.programName}.

Your email isn't on the event's checked-in list yet, so an organiser will confirm it. Once they do, your project goes live with the time you submitted it. You don't need to submit again.

If you checked in with a different email, you can also submit again using that one.

Open the program page:
${link}`;
}
