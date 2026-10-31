import { escapeHtml } from './escape.js';

// Confirms a public project submission (or resubmission) to the submitter, with a
// link back to the program page and instructions to resubmit before the deadline.
// Tracked programs (payload.details) also get a summary of what was submitted,
// and updates go through "Update my submission" with the email verified.

const TRACK_LABEL = { privacy: 'Privacy', agentic: 'Agentic Commerce', both: 'Privacy and Agentic Commerce' };
const summaryRows = (d) =>
  d
    ? [
        ['Track', TRACK_LABEL[d.track] ?? d.track],
        ['Pitch', d.pitch],
        ['Testnet transaction', d.testnetTxid],
        ['Next milestone', d.nextStep],
      ].filter(([, v]) => v)
    : [];
const updateHowTo = (payload, deadline) =>
  payload.details
    ? `Need to change something? Open the program page and choose "Update my submission"; you'll confirm this email with a sign-in link${deadline ? ` (before ${deadline})` : ''}.`
    : null;

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
  const rows = summaryRows(payload.details);
  const summary = rows.length
    ? `<table>${rows.map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('')}</table>`
    : '';
  const tracked = updateHowTo(payload, deadline);
  return `<p>${lead}</p>
${summary}
${tracked ? `<p>${escapeHtml(tracked)}</p>` : deadlineLine}
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
  const rows = summaryRows(payload.details);
  const summary = rows.length ? `\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}` : '';
  const tracked = updateHowTo(payload, deadline);
  return `${lead}${summary}

${tracked ?? deadlineLine}

Open the program page:
${link}`;
}
