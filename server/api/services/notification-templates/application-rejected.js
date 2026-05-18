import { escapeHtml } from './escape.js';

export function subject(payload) {
  return `Update on your ${payload.programName} application`;
}

export function html(payload) {
  return `<p>Thanks for applying to <strong>${escapeHtml(payload.programName)}</strong> with <strong>${escapeHtml(payload.projectName)}</strong>.</p>
<p>We weren't able to move forward this time, but we'd love to see you back for future programs.</p>`;
}

export function text(payload) {
  return `Thanks for applying to ${payload.programName} with ${payload.projectName}.\n\nWe weren't able to move forward this time, but we'd love to see you back for future programs.`;
}
