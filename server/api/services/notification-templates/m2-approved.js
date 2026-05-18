import { escapeHtml } from './escape.js';

export function subject(payload) {
  return `${payload.projectName} — milestone 2 approved`;
}

export function html(payload) {
  return `<p>Milestone 2 for <strong>${escapeHtml(payload.projectName)}</strong> has been approved. Nice work.</p>`;
}

export function text(payload) {
  return `Milestone 2 for ${payload.projectName} has been approved. Nice work.`;
}
