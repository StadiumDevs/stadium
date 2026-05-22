import { useCallback, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AdminAuthArg } from "@/lib/api";

/**
 * Social (email magic link) auth via Supabase. Parallel to useWalletAuth: it
 * tracks the current Supabase session and exposes the access token, which admin
 * API calls pass as `x-supabase-token` (via authHeader()). The server checks
 * the verified email against program_admin_emails for view access.
 *
 * Degrades gracefully when Supabase isn't configured (isAvailable === false).
 */
export function useSocialAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setToken(data.session?.access_token ?? null);
      setEmail(data.session?.user?.email ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /** Send a one-time magic-link to `address`; they return to `redirectTo`. */
  const signInWithEmail = useCallback(async (address: string, redirectTo?: string) => {
    if (!supabase) throw new Error("Email sign-in is not configured.");
    const { error } = await supabase.auth.signInWithOtp({
      email: address.trim(),
      options: { emailRedirectTo: redirectTo ?? window.location.href },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setToken(null);
    setEmail(null);
  }, []);

  /** Header arg for the API client when a social session is active. */
  const authHeader = useCallback(
    (): AdminAuthArg => (token ? { "x-supabase-token": token } : undefined),
    [token],
  );

  return {
    isAvailable: isSupabaseConfigured,
    loading,
    token,
    email,
    isAuthed: !!token,
    signInWithEmail,
    signOut,
    authHeader,
  };
}
