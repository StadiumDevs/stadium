import { escapeHtml } from './escape.js';

// Notifies a winning submitter that their project won a prize, with the prize
// details, a link to the published results, and a note that the team will reach
// out to arrange collection (Bitrefill prizes are off-chain giftcards).

const prizeText = (payload) => {
  const amount = payload.prizeAmount != null ? String(payload.prizeAmount) : '';
  const currency = payload.prizeCurrency || '';
  const money = `${amount} ${currency}`.trim();
  const label = payload.prizeLabel || '';
  if (label && money) return `${label} (${money})`;
  return label || money || 'a prize';
};

export function subject(payload) {
  return `You won ${prizeText(payload)} at ${payload.programName}`;
}

export function html(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com';
  const name = payload.submitterName ? `, ${escapeHtml(payload.submitterName)}` : '';
  return `<p>Congratulations${name}!</p>
<p>Your project <strong>${escapeHtml(payload.projectTitle)}</strong> won <strong>${escapeHtml(prizeText(payload))}</strong> at <strong>${escapeHtml(payload.programName)}</strong>.</p>
<p>The WebZero team will reach out to arrange delivery of your prize. Just reply to this email if you have any questions or your contact details change.</p>
<p><a href="${escapeHtml(link)}">See the published results</a></p>`;
}

export function text(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com';
  const name = payload.submitterName ? `, ${payload.submitterName}` : '';
  return `Congratulations${name}!

Your project "${payload.projectTitle}" won ${prizeText(payload)} at ${payload.programName}.

The WebZero team will reach out to arrange delivery of your prize. Just reply to this email if you have any questions or your contact details change.

See the published results:
${link}`;
}
