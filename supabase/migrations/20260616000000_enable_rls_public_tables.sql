-- Enable Row Level Security on every public table (deny-by-default).
--
-- WHY: the Supabase Data API (PostgREST) exposes the `public` schema to the
-- `anon` / `authenticated` roles via the public anon key, which ships in the
-- client bundle. With RLS disabled, that key can read AND write every public
-- table, bypassing the Express API and its SIWS/admin auth. Verified on prod:
-- anon could SELECT and DELETE/UPDATE projects, program_admins, multisig_*.
--
-- WHY THIS IS SAFE HERE: the browser never queries these tables — the client
-- uses Supabase only for auth (supabase.auth.*), and ALL data access goes
-- through the Express server using the SERVICE_ROLE key, which has BYPASSRLS.
-- So enabling RLS with NO policies denies anon/authenticated while the server
-- is unaffected. If a table ever needs direct anon/authenticated access, add an
-- explicit policy for it.
--
-- Idempotent: ENABLE on an already-RLS-enabled table is a no-op.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
