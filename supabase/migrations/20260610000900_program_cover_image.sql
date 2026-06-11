-- A cover image for the program's public page (e.g. the Luma event banner), so
-- the hackathon page looks attractive. Admin-set URL; nullable.
--
-- Additive and idempotent — safe to re-run.

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
