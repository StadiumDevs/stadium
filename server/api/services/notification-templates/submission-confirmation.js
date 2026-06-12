import { escapeHtml } from './escape.js';

// Confirms a public project submission (or resubmission) to the submitter, with a
// link back to the program page and instructions to resubmit before the deadline.

const fmtDeadline = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

export function subject(payload) {
  const verb = payload.resubmitted ? 'updated' : 'received';
  return `Your submission to ${payload.programName} was ${verb}`;
}

export function html(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com';
  const deadline = fmtDeadline(payload.deadline);
  const lead = payload.resubmitted
    ? `Your project <strong>${escapeHtml(payload.projectTitle)}</strong> has been <strong>updated</strong> for <strong>${escapeHtml(payload.programName)}</strong>.`
    : `Thanks${payload.submitterName ? `, ${escapeHtml(payload.submitterName)}` : ''}! Your project <strong>${escapeHtml(payload.projectTitle)}</strong> has been submitted to <strong>${escapeHtml(payload.programName)}</strong>.`;
  const deadlineLine = deadline
    ? `<p>Need to change something? You can resubmit any time before the deadline (<strong>${escapeHtml(deadline)}</strong>) — just reopen the form on the program page and submit again with this same email. Your latest submission replaces the previous one.</p>`
    : `<p>Need to change something? Reopen the form on the program page and submit again with this same email before submissions close. Your latest submission replaces the previous one.</p>`;
  return `<p>${lead}</p>
${deadlineLine}
<p><a href="${escapeHtml(link)}">Open the program page</a></p>`;
}

export function text(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com';
  const deadline = fmtDeadline(payload.deadline);
  const lead = payload.resubmitted
    ? `Your project "${payload.projectTitle}" has been updated for ${payload.programName}.`
    : `Thanks${payload.submitterName ? `, ${payload.submitterName}` : ''}! Your project "${payload.projectTitle}" has been submitted to ${payload.programName}.`;
  const deadlineLine = deadline
    ? `Need to change something? You can resubmit any time before the deadline (${deadline}) — reopen the form on the program page and submit again with this same email. Your latest submission replaces the previous one.`
    : `Need to change something? Reopen the form on the program page and submit again with this same email before submissions close. Your latest submission replaces the previous one.`;
  return `${lead}

${deadlineLine}

Open the program page:
${link}`;
}
