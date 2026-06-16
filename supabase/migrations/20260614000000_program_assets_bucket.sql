-- Public Storage bucket for admin-uploaded program imagery (cover banners).
-- Lets admins upload a high-fidelity cover image instead of relying on an
-- external URL. Writes go through the server using the service-role key; reads
-- are public so the banner renders on the public program page.
--
-- Additive and idempotent — safe to re-run.

-- Create the bucket (public read). ON CONFLICT keeps a re-run a no-op.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'program-assets',
  'program-assets',
  true,
  5242880, -- 5MB, mirrors the server-side cap
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read of objects in this bucket. The service role bypasses RLS for
-- writes, so we only need a SELECT policy for anonymous/public reads.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read program-assets'
  ) THEN
    CREATE POLICY "Public read program-assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'program-assets');
  END IF;
END $$;
