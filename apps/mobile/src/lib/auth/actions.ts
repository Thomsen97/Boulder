import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { getSupabase } from "./supabase";

export class AuthError extends Error {
  constructor(public readonly kind: "cancelled" | "failed") {
    super(kind);
    this.name = "AuthError";
  }
}

/** AUTH-1: sends a 6-digit one-time code (no magic link). Creates the account on first use. */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw new AuthError("failed");
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const { error } = await getSupabase().auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: "email",
  });
  if (error) throw new AuthError("failed");
}

/**
 * Google sign-in in the system browser with PKCE; the app receives the one-time code on the
 * `boulder://` redirect and exchanges it for a session. A native Google flow may replace this later.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabase();
  const redirectTo = Linking.createURL("auth/callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new AuthError("failed");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") throw new AuthError("cancelled");

  const code = new URL(result.url).searchParams.get("code");
  if (!code) throw new AuthError("failed");
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw new AuthError("failed");
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Returns a new access token, or null when the refresh token is no longer valid. Throws when the
 * refresh could not be attempted (offline), so the caller does not mistake that for a revoked session.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const { data, error } = await getSupabase().auth.refreshSession();
  if (error) {
    if (isAuthRetryableFetchError(error)) throw error;
    return null;
  }
  return data.session?.access_token ?? null;
}

/** Revokes the refresh token on the server; falls back to clearing only this device. */
export async function signOutOfSupabase(): Promise<void> {
  const auth = getSupabase().auth;
  try {
    const { error } = await auth.signOut();
    if (!error) return;
  } catch {
    // fall through to the local sign-out
  }
  await auth.signOut({ scope: "local" });
}
