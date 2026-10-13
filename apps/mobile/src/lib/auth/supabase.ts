import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { LargeSecureStore } from "./largeSecureStore";

let shared: SupabaseClient | undefined;

/**
 * The Supabase client is used for authentication only (ADR-0002). It is created lazily so mock
 * mode and tests never need the project settings. The publishable key is public by design.
 */
export function getSupabase(): SupabaseClient {
  if (shared) return shared;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required in live mode",
    );
  }
  shared = createClient(url, key, {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  return shared;
}

export function resetSupabaseForTests(client?: SupabaseClient) {
  shared = client;
}
