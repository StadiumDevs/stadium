-- Adds optional metadata for the completed-program results summary panel:
--   honorary_mentions: JSON array of { name, videoUrl?, githubUrl? } objects
--   gallery_url:       link to a photo album (e.g. Google Drive folder)
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS honorary_mentions JSONB,
  ADD COLUMN IF NOT EXISTS gallery_url TEXT;
