// Thin, read-only client for the Luma public API (https://docs.luma.com).
//
// We use it to mirror an event's *checked-in* guests into program_signups so
// the submission gate can verify "only checked-in attendees may submit" without
// us hosting a CSV of attendee data. The Luma API has no per-email lookup, so we
// page the full guest list (`get-guests`) and filter locally.
//
// Verified against a live event (evt-…, 464 guests, 10 pages @100, ~4.4s sweep):
//   - auth header is `x-luma-api-key`
//   - Luma's edge (Cloudflare) returns 403 for requests with a default runtime
//     User-Agent, so we ALWAYS send an explicit one. This is not cosmetic.
//   - check-in is `entry.checked_in_at` OR any `entry.event_tickets[].checked_in_at`
//   - response shape: { entries: [...], has_more, next_cursor }, cursor via
//     `pagination_cursor`, page size via `pagination_limit` (we use 100).

const BASE = 'https://public-api.luma.com/v1';
const USER_AGENT = 'stadium-webzero/1.0';
const PAGE_LIMIT = 100;
const MAX_PAGES = 100; // ~10k guests; guards against a bad cursor looping forever
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_BACKOFF_MS = 750;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function apiKey() {
  const k = process.env.LUMA_API_KEY;
  return typeof k === 'string' && k.trim() ? k.trim() : null;
}

// Whether the server is configured to talk to Luma at all. The gate stays in
// CSV/test-email mode until this is true, so an unconfigured deploy can't lock
// everyone out.
export function isConfigured() {
  return apiKey() !== null;
}

// Normalize a Luma guest entry to the minimal shape we persist. We deliberately
// keep only email + name (not Luma's full payload) to minimize stored PII.
export function normalizeGuest(entry) {
  const email = String(entry?.email || entry?.user_email || '').trim().toLowerCase();
  const name = entry?.name || entry?.user_name || null;
  const tickets = Array.isArray(entry?.event_tickets) ? entry.event_tickets : [];
  const checkedIn = Boolean(entry?.checked_in_at) || tickets.some((t) => Boolean(t?.checked_in_at));
  return { email, name, checkedIn, approvalStatus: entry?.approval_status ?? null };
}

// Fetch one page. One retry on timeout / 429 / 5xx with a short backoff; any
// other non-2xx fails fast (a 4xx won't fix itself on retry).
async function getPage(eventId, cursor, key) {
  const url = new URL(`${BASE}/event/get-guests`);
  url.searchParams.set('event_api_id', eventId);
  url.searchParams.set('pagination_limit', String(PAGE_LIMIT));
  if (cursor) url.searchParams.set('pagination_cursor', cursor);

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await sleep(RETRY_BACKOFF_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'x-luma-api-key': key, 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Luma get-guests transient ${res.status}`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`Luma get-guests failed: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      // Retry once on abort (timeout); otherwise bail after the loop.
      if (err?.name !== 'AbortError' && attempt > 0) throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr || new Error('Luma get-guests failed');
}

// Page the full guest list. Returns { guests, pages, truncated }. `truncated`
// means we hit MAX_PAGES before Luma said it was done — the caller must treat a
// truncated result as untrustworthy and NOT overwrite a good cache with it.
export async function fetchAllGuests(eventId) {
  const key = apiKey();
  if (!key) throw new Error('LUMA_API_KEY not set');
  if (!eventId) throw new Error('eventId required');

  const guests = [];
  let cursor = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop -- cursor pagination is inherently serial
    const data = await getPage(eventId, cursor, key);
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    for (const entry of entries) {
      const guest = normalizeGuest(entry);
      if (guest.email) guests.push(guest);
    }
    if (!data?.has_more || !data?.next_cursor) {
      return { guests, pages: page + 1, truncated: false };
    }
    cursor = data.next_cursor;
  }
  return { guests, pages: MAX_PAGES, truncated: true };
}

// Gate modes. 'checked_in' (default, in-person events) requires a physical
// check-in. 'approved' accepts any approved registrant — used to dry-run the
// flow BEFORE an event starts (nobody is checked in yet), or if a program ever
// wants "registered counts" rather than "checked-in counts".
export const GATE_MODES = ['checked_in', 'approved'];

function isEligible(guest, mode) {
  // Checked-in guests are always eligible; 'approved' additionally lets through
  // anyone whose registration is approved.
  if (guest.checkedIn) return true;
  return mode === 'approved' && guest.approvalStatus === 'approved';
}

// The gate-eligible subset plus totals, for the sync service.
export async function fetchEligibleGuests(eventId, mode = 'checked_in') {
  const { guests, pages, truncated } = await fetchAllGuests(eventId);
  return {
    total: guests.length,
    eligible: guests.filter((g) => isEligible(g, mode)),
    pages,
    truncated,
  };
}
