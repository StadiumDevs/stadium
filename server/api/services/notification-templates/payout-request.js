import { escapeHtml } from './escape.js';

// Asks a winning point person for their payout details: a link to the
// project page, where they sign in with the email they submitted with.

const deadlineText = (d) => (d ? ` by ${d}` : '');

export function subject(payload) {
  return `Send your payout details for ${payload.programName}`;
}

export function html(payload) {
  const name = payload.submitterName ? `, ${escapeHtml(payload.submitterName)}` : '';
  return `<p>Hi${name},</p>
<p>Congratulations again on <strong>${escapeHtml(payload.projectTitle)}</strong> at <strong>${escapeHtml(payload.programName)}</strong>. To receive your prize (${escapeHtml(payload.awardsText)}), send your payout details${escapeHtml(deadlineText(payload.deadline))}:</p>
<p><a href="${escapeHtml(payload.link)}">Open your project page and send your payout details</a></p>
<p>Sign in with this email address. We ask for your legal name, country of tax residence, and your ${escapeHtml(payload.currency)} wallet address and the network it is on.</p>
<p><strong>Double-check your address.</strong> A payment sent to the address you give can't be recovered.</p>
<p>We pay within 14 days of receiving complete details and email you the transaction link. Reply to this email with any questions.</p>`;
}

export function text(payload) {
  const name = payload.submitterName ? `, ${payload.submitterName}` : '';
  return `Hi${name},

Congratulations again on "${payload.projectTitle}" at ${payload.programName}. To receive your prize (${payload.awardsText}), send your payout details${deadlineText(payload.deadline)}:

${payload.link}

Sign in with this email address. We ask for your legal name, country of tax residence, and your ${payload.currency} wallet address and the network it is on.

Double-check your address. A payment sent to the address you give can't be recovered.

We pay within 14 days of receiving complete details and email you the transaction link. Reply to this email with any questions.`;
}
