import { escapeHtml } from './escape.js';

export function subject(payload) {
  return `You're an admin for ${payload.programName}`;
}

export function html(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com/admin';
  return `<p>You've been added as an admin for <strong>${escapeHtml(payload.programName)}</strong> on Stadium.</p>
<p>Sign in with this email address (<strong>${escapeHtml(payload.email)}</strong>) to view your program:</p>
<p><a href="${escapeHtml(link)}">Open ${escapeHtml(payload.programName)}</a></p>
<p>No wallet or password needed. You'll get a one-time sign-in link by email.</p>`;
}

export function text(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com/admin';
  return `You've been added as an admin for ${payload.programName} on Stadium.

Sign in with this email address (${payload.email}) to view your program:
${link}

No wallet or password needed. You'll get a one-time sign-in link by email.`;
}
