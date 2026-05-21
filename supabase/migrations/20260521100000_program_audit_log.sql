-- Per-program audit log for admin actions.
--
-- Records sponsor add/edit/delete, signup CSV imports + deletes, application
-- status changes, program edits, and admin add/remove. Useful for handoffs
-- between WebZero ops and per-event admins ("what did the previous admin
-- do last week?"). Writes are best-effort — a logging failure must never
-- block the user-visible action (enforced at the service layer with
-- `logSafe`, not by trigger).
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS program_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  actor_chain  TEXT,
  actor_wallet TEXT,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_audit_log_program_recent
  ON program_audit_log(program_id, created_at DESC);
