import { escapeHtml } from './escape.js';

export function subject(payload) {
  return `${payload.projectName} — feedback on your milestone 2`;
}

export function html(payload) {
  return `<p>We've reviewed milestone 2 for <strong>${escapeHtml(payload.projectName)}</strong> and have some feedback for you:</p>
<blockquote>${escapeHtml(payload.feedback)}</blockquote>
<p>Make the updates and resubmit when you're ready.</p>`;
}

export function text(payload) {
  return `We've reviewed milestone 2 for ${payload.projectName} and have some feedback for you:\n\n${payload.feedback}\n\nMake the updates and resubmit when you're ready.`;
}
