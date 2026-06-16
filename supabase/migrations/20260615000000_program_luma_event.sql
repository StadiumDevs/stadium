-- Luma API guest verification.
--
-- A program with luma_event_id set has its checked-in guest list mirrored from
-- the Luma public API into program_signups (source='luma_api') instead of an
-- admin uploading a CSV. The submission gate verifies the submitter's email
-- against that synced set. We store the last sync time + status so the admin UI
-- can show "synced N min ago / ✓/✗" and the gate can decide when to lazily
-- refresh (TTL).
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS luma_event_id        TEXT,
  ADD COLUMN IF NOT EXISTS last_guest_sync_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_guest_sync_status TEXT;
