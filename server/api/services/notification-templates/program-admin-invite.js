import { escapeHtml } from './escape.js';

const roleNoun = (payload) => (payload.role === 'judge' ? 'judge' : 'admin');

export function subject(payload) {
  return `You're a ${roleNoun(payload)} for ${payload.programName}`;
}

export function html(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com/admin';
  const isJudge = roleNoun(payload) === 'judge';
  const intro = isJudge
    ? `You've been added as a <strong>judge</strong> for <strong>${escapeHtml(payload.programName)}</strong> on Stadium.`
    : `You've been added as an admin for <strong>${escapeHtml(payload.programName)}</strong> on Stadium.`;
  const cta = isJudge
    ? `Sign in with this email address (<strong>${escapeHtml(payload.email)}</strong>) to review and score the submissions:`
    : `Sign in with this email address (<strong>${escapeHtml(payload.email)}</strong>) to view your program:`;
  return `<p>${intro}</p>
<p>${cta}</p>
<p><a href="${escapeHtml(link)}">Open ${escapeHtml(payload.programName)}</a></p>
<p>No wallet or password needed. You'll get a one-time sign-in link by email.</p>`;
}

export function text(payload) {
  const link = payload.link ?? 'https://stadium.joinwebzero.com/admin';
  const isJudge = roleNoun(payload) === 'judge';
  const intro = isJudge
    ? `You've been added as a judge for ${payload.programName} on Stadium.`
    : `You've been added as an admin for ${payload.programName} on Stadium.`;
  const cta = isJudge
    ? `Sign in with this email address (${payload.email}) to review and score the submissions:`
    : `Sign in with this email address (${payload.email}) to view your program:`;
  return `${intro}

${cta}
${link}

No wallet or password needed. You'll get a one-time sign-in link by email.`;
}
