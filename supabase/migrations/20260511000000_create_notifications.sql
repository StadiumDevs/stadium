-- Stadium Phase 2 Revamp — notifications (issue #68, Phase 2 §4.2).
-- See docs/stadium-revamp-phase-2-spec.md §4.2.
--
-- One row per (recipient_wallet, event_type, source_id) combination.
-- Deduplication is enforced by the unique index notifications_dedupe.
-- status transitions: queued → sent | failed; or skipped when the
-- wallet_contacts row is absent or has notifications_enabled = false.

CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_wallet    TEXT        NOT NULL,
  event_type          TEXT        NOT NULL CHECK (event_type IN ('application_accepted','application_rejected','m2_approved','m2_changes_requested')),
  source_id           TEXT        NOT NULL,
  payload             JSONB       NOT NULL,
  status              TEXT        NOT NULL CHECK (status IN ('queued','sent','failed','skipped')),
  provider_message_id TEXT,
  error               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at             TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe
  ON notifications (recipient_wallet, event_type, source_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_wallet, created_at DESC);
