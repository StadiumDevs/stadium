const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);
}
