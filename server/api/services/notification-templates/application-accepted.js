import { escapeHtml } from './escape.js';

export function subject(payload) {
  return `You're in — ${payload.programName}`;
}

export function html(payload) {
  const projectUrl = payload.projectUrl ?? 'https://stadium.webzero.dev';
  return `<p>Great news — <strong>${escapeHtml(payload.projectName)}</strong> has been accepted into <strong>${escapeHtml(payload.programName)}</strong>.</p>
<p>Head to your <a href="${escapeHtml(projectUrl)}">project page</a> to see what's next.</p>`;
}

export function text(payload) {
  const projectUrl = payload.projectUrl ?? 'https://stadium.webzero.dev';
  return `Great news — ${payload.projectName} has been accepted into ${payload.programName}.\n\nHead to your project page to see what's next: ${projectUrl}`;
}
