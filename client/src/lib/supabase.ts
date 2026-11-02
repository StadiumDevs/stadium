import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client-side Supabase Auth (email magic link) for social sign-in. The server
// still authorizes — it verifies the access token and checks the email against
// program_admin_emails. This client only establishes WHO signed in.
//
// Null when the project isn't configured (local dev / preview / mock mode), so
// callers degrade to "email sign-in unavailable" instead of crashing.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Implicit flow (the default): the sign-in link returns the session in the
// URL hash, read on load (detectSessionInUrl). PKCE would break links opened in
// another browser (e.g. a phone's email app). Pages must not strip the hash
// before it's read (see ProgramDetailPage's ?submit= handling).
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, { auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } })
    : null;

export const isSupabaseConfigured = supabase !== null;
