// Shared CSV helpers so every export inherits the same RFC-4180 quoting and,
// critically, the same formula-injection defense.
//
// SECURITY: Excel / Google Sheets / Numbers auto-execute any cell starting with
// `=`, `+`, `-`, `@`, tab or CR. User-submitted fields (name, email, identifier,
// wallet, …) flow into exports an admin downloads, so a malicious applicant
// could exfiltrate the admin's data via `=WEBSERVICE(…)` / `=HYPERLINK(…)`.
// Prefixing such cells with a single quote neuters the formula while leaving the
// visible value intact (the quote is a sentinel the spreadsheet strips on
// display). Any new CSV export MUST route every cell through `csvCell`.

const FORMULA_INJECTION_LEAD = /^[=+\-@\t\r]/;

/** Escape one cell: formula-injection guard + RFC-4180 quoting. */
export function csvCell(val) {
  if (val == null) return '';
  let s = String(val);
  if (FORMULA_INJECTION_LEAD.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Join one row of raw values into an escaped CSV line. */
export function csvRow(cells) {
  return cells.map(csvCell).join(',');
}
