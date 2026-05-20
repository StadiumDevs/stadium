/**
 * Luma signup CSV parser.
 *
 * Luma exports vary by event template, so the parser is forgiving:
 *   - canonical fields (email, name, wallet, registered_at) are pulled from
 *     a small synonym list rather than a fixed header set
 *   - everything else lands in `raw_row` so no data is silently dropped
 *   - rows missing an email are reported as `skipped`, never inserted
 *   - email is lowercased and trimmed for dedup
 *
 * Sync API: takes a CSV string, returns { rows, errors }. The caller decides
 * whether to dry-run or commit. Using `csv-parser` (already in deps) via its
 * Readable-stream form so we don't pull in a second parser.
 */

import { Readable } from 'node:stream';
import csv from 'csv-parser';

const norm = (s) => String(s || '').trim().toLowerCase().replace(/[\s_-]+/g, '');

// Synonym groups — left side is canonical, right side is normalized header.
const EMAIL_HEADERS = ['email', 'emailaddress', 'mail'];
const NAME_HEADERS = ['name', 'fullname', 'attendeename'];
const WALLET_HEADERS = ['wallet', 'walletaddress', 'address', 'cryptowallet', 'web3wallet'];
const REGISTERED_AT_HEADERS = [
  'registeredat',
  'registrationtime',
  'registrationdate',
  'createdat',
  'rsvpedat',
  'approvedat',
];

const findKey = (row, synonyms) => {
  for (const k of Object.keys(row)) {
    if (synonyms.includes(norm(k))) return k;
  }
  return null;
};

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Parse a Luma signup CSV into normalized rows + skipped row count.
 *
 * @param {string} csvText
 * @returns {Promise<{ rows: Array<{ email, name, wallet, registeredAt, rawRow }>, skipped: number, totalParsed: number }>}
 */
export async function parseLumaCsv(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    return { rows: [], skipped: 0, totalParsed: 0 };
  }

  return new Promise((resolve, reject) => {
    const rows = [];
    let skipped = 0;
    let totalParsed = 0;
    let emailKey = null;
    let nameKey = null;
    let walletKey = null;
    let registeredAtKey = null;

    Readable.from(csvText)
      .pipe(csv())
      .on('data', (row) => {
        totalParsed += 1;
        if (emailKey === null) {
          emailKey = findKey(row, EMAIL_HEADERS);
          nameKey = findKey(row, NAME_HEADERS);
          walletKey = findKey(row, WALLET_HEADERS);
          registeredAtKey = findKey(row, REGISTERED_AT_HEADERS);
        }
        const emailRaw = emailKey ? row[emailKey] : '';
        const email = String(emailRaw || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
          skipped += 1;
          return;
        }
        rows.push({
          email,
          name: nameKey ? String(row[nameKey] || '').trim() || null : null,
          wallet: walletKey ? String(row[walletKey] || '').trim() || null : null,
          registeredAt: registeredAtKey ? parseDate(row[registeredAtKey]) : null,
          rawRow: row,
        });
      })
      .on('end', () => resolve({ rows, skipped, totalParsed }))
      .on('error', reject);
  });
}
