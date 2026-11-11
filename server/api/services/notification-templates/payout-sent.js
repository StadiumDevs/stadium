import { escapeHtml } from './escape.js';

// Tells a winner their prize was paid, with the transaction link (the terms:
// "You get an email with the transaction link when the payment is sent").

const money = (p) => `${p.amount} ${p.currency}`.trim();

export function subject(payload) {
  return `Your ${payload.programName} prize was paid: ${money(payload)}`;
}

export function html(payload) {
  const name = payload.submitterName ? `, ${escapeHtml(payload.submitterName)}` : '';
  return `<p>Hi${name},</p>
<p>We've sent <strong>${escapeHtml(money(payload))}</strong> for <strong>${escapeHtml(payload.awardLabel)}</strong> (${escapeHtml(payload.projectTitle)}, ${escapeHtml(payload.programName)}) on ${escapeHtml(payload.networkLabel)} to <code>${escapeHtml(payload.address)}</code>.</p>
<p><a href="${escapeHtml(payload.txUrl)}">See the transaction</a></p>
<p>Reply to this email if anything looks wrong.</p>`;
}

export function text(payload) {
  const name = payload.submitterName ? `, ${payload.submitterName}` : '';
  return `Hi${name},

We've sent ${money(payload)} for ${payload.awardLabel} (${payload.projectTitle}, ${payload.programName}) on ${payload.networkLabel} to ${payload.address}.

See the transaction:
${payload.txUrl}

Reply to this email if anything looks wrong.`;
}
