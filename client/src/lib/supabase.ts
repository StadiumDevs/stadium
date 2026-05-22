import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client-side Supabase Auth (email magic link) for social sign-in. The server
// still authorizes — it verifies the access token and checks the email against
// program_admin_emails. This client only establishes WHO signed in.
//
// Null when the project isn't configured (local dev / preview / mock mode), so
// callers degrade to "email sign-in unavailable" instead of crashing.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;
