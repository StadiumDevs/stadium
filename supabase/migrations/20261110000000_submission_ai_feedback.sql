-- AI-generated feedback per submission (tracked programs). Written by a
-- platform admin's "generate" action from the judges' scores and notes, kept as
-- a draft until an admin reviews and publishes it:
-- { "draft": {summary, strengths[], improvements[]} | null,
--   "published": {summary, strengths[], improvements[]} | null,
--   "model": text, "generatedAt": iso, "publishedAt": iso | null }
-- Only "published" is ever public (and only once results are published).
ALTER TABLE program_submissions
  ADD COLUMN IF NOT EXISTS ai_feedback JSONB;
