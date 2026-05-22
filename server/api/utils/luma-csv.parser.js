/**
 * Signup CSV parser (Luma + Tally/Typeform).
 *
 * The parser is forgiving because exports vary by template:
 *   - canonical fields (email, name, wallet, registered_at, telegram) are pulled
 *     from a small synonym list rather than a fixed header set
 *   - everything else lands in `raw_row` so no data is silently dropped
 *   - email is lowercased and trimmed and used as the dedup identity
 *
 * Identity mode is decided by the headers, once, from the first row:
 *   - if an email column exists → EMAIL mode (Luma): each row needs an email
 *     with an "@"; rows without one are `skipped`. (Unchanged behaviour.)
 *   - if there is NO email column but a Telegram column exists → TELEGRAM mode
 *     (Tally/Typeform forms that collect a handle, not an email): the dedup
 *     identity is a surrogate `<handle>@telegram.imported` derived from the
 *     Telegram handle. Rows without a usable handle are `skipped`. This lets
 *     email-less event exports import under the existing NOT NULL `email`
 *     column + UNIQUE(program_id, email) constraint without a migration.
 *
 * Sync API: takes a CSV string, returns { rows, skipped, totalParsed }. The
 * caller decides whether to dry-run or commit. Uses `csv-parser` (already in
 * deps) via its Readable-stream form.
 */

import { Readable } from 'node:stream';
import csv from 'csv-parser';

const norm = (s) => String(s || '').trim().toLowerCase().replace(/[\s_()-]+/g, '');

// Synonym groups — left side is canonical, right side is normalized header.
const EMAIL_HEADERS = ['email', 'emailaddress', 'mail'];
const NAME_HEADERS = [
  'name',
  'fullname',
  'attendeename',
  'pleaseenteryourname',
  'yourname',
  'teammembername',
  'teammembernames',
];
const WALLET_HEADERS = ['wallet', 'walletaddress', 'address', 'cryptowallet', 'web3wallet'];
const TELEGRAM_HEADERS = [
  'telegram',
  'telegramhandle',
  'telegramusername',
  'telegramcontact',
  'maintelegramcontact',
  'pleaseprovideyourtelegramcontact',
];
const REGISTERED_AT_HEADERS = [
  'registeredat',
  'registrationtime',
  'registrationdate',
  'createdat',
  'rsvpedat',
  'approvedat',
  'submittedat',
  'submitdateutc',
  'startdateutc',
  'timestamp',
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

// Build a stable surrogate email from a Telegram handle so email-less exports
// satisfy the NOT NULL email column and dedup by handle. Returns null when the
// handle sanitises to nothing.
const telegramSurrogate = (raw) => {
  const handle = String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  return handle ? `${handle}@telegram.imported` : null;
};

/**
 * Parse a signup CSV into normalized rows + skipped row count.
 *
 * @param {string} csvText
 * @returns {Promise<{ rows: Array<{ email, name, wallet, registeredAt, telegram, rawRow }>, skipped: number, totalParsed: number }>}
 */
export async function parseLumaCsv(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    return { rows: [], skipped: 0, totalParsed: 0 };
  }

  return new Promise((resolve, reject) => {
    const rows = [];
    let skipped = 0;
    let totalParsed = 0;
    let headersResolved = false;
    let emailKey = null;
    let nameKey = null;
    let walletKey = null;
    let registeredAtKey = null;
    let telegramKey = null;

    Readable.from(csvText)
      .pipe(csv())
      .on('data', (row) => {
        totalParsed += 1;
        if (!headersResolved) {
          emailKey = findKey(row, EMAIL_HEADERS);
          nameKey = findKey(row, NAME_HEADERS);
          walletKey = findKey(row, WALLET_HEADERS);
          registeredAtKey = findKey(row, REGISTERED_AT_HEADERS);
          telegramKey = findKey(row, TELEGRAM_HEADERS);
          headersResolved = true;
        }

        const telegram = telegramKey ? String(row[telegramKey] || '').trim() || null : null;

        // Identity: prefer a real email column; otherwise fall back to a
        // Telegram-derived surrogate for email-less form exports.
        let email;
        if (emailKey) {
          email = String(row[emailKey] || '').trim().toLowerCase();
          if (!email || !email.includes('@')) {
            skipped += 1;
            return;
          }
        } else if (telegramKey) {
          email = telegramSurrogate(row[telegramKey]);
          if (!email) {
            skipped += 1;
            return;
          }
        } else {
          skipped += 1;
          return;
        }

        rows.push({
          email,
          name: nameKey ? String(row[nameKey] || '').trim() || null : null,
          wallet: walletKey ? String(row[walletKey] || '').trim() || null : null,
          registeredAt: registeredAtKey ? parseDate(row[registeredAtKey]) : null,
          telegram,
          rawRow: row,
        });
      })
      .on('end', () => resolve({ rows, skipped, totalParsed }))
      .on('error', reject);
  });
}
