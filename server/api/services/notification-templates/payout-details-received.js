import { escapeHtml } from './escape.js';

// Tells the organisers a winner sent (or changed) their payout details: the
// project, the point person, the awards and the details, with the previous
// address when it changed. Internal only; never sent to winners.

const row = (k, v) => `<tr><td style="padding:2px 12px 2px 0;color:#666">${escapeHtml(k)}</td><td style="padding:2px 0"><strong>${escapeHtml(v ?? '')}</strong></td></tr>`;

export function subject(payload) {
  return `Payout details${payload.updated ? ' updated' : ''}: ${payload.projectTitle} (${payload.programName})`;
}

const lines = (p) => [
  ['Project', p.projectTitle],
  ['Point person', `${p.submitterName ?? ''} <${p.email}>`],
  ['Awards', p.awardsText],
  ['Legal name', p.legalName],
  ['Country of tax residence', p.taxCountry],
  ['Network', p.networkLabel],
  ['Address', p.address],
  ...(p.previousAddress && p.previousAddress !== p.address ? [['Previous address', `${p.previousAddress} (${p.previousNetworkLabel})`]] : []),
];

export function html(payload) {
  const what = payload.updated ? 'updated their payout details' : 'sent their payout details';
  return `<p><strong>${escapeHtml(payload.projectTitle)}</strong> ${what} for ${escapeHtml(payload.programName)}.</p>
<table>${lines(payload).map(([k, v]) => row(k, v)).join('')}</table>
<p><a href="${escapeHtml(payload.adminLink)}">Open payouts in Stadium</a></p>`;
}

export function text(payload) {
  const what = payload.updated ? 'updated their payout details' : 'sent their payout details';
  return `${payload.projectTitle} ${what} for ${payload.programName}.

${lines(payload).map(([k, v]) => `${k}: ${v ?? ''}`).join('\n')}

Open payouts in Stadium:
${payload.adminLink}`;
}
