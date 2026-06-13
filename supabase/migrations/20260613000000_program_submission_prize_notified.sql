-- Track when a winning submission was emailed about its prize, so publishing
-- results notifies each winner exactly once (unpublish/republish is a no-op for
-- winners already notified). Nullable + additive; safe to apply on a live table.
ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS prize_notified_at TIMESTAMPTZ;
