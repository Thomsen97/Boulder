import { create } from "zustand";

import { getApiMode } from "@/lib/api/mode";
import { loadActions, loadSupabase } from "@/lib/auth/lazy";

const isLive = () => getApiMode("auth") === "live";

interface SessionState {
  /** False while the stored session is being restored at start (live mode only). */
  ready: boolean;
  signedIn: boolean;
  /** ISO time of the last interactive sign-in, used by the delete-account re-authentication. */
  lastSignInAt: string | null;
  /** Mock mode only. In live mode the session comes from Supabase (see `startSessionSync`). */
  signIn: (now?: Date) => void;
  signOut: () => void;
  /** Live mode: the session is already invalid (rejected refresh, repeated 401). Clears this device only. */
  endSession: () => void;
}

export const useSession = create<SessionState>((set) => ({
  ready: !isLive(),
  signedIn: false,
  lastSignInAt: null,
  signIn: (now = new Date()) => set({ signedIn: true, lastSignInAt: now.toISOString() }),
  signOut: () => {
    set({ signedIn: false, lastSignInAt: null });
    if (isLive())
      void loadActions()
        .signOutOfSupabase("global")
        .catch(() => undefined);
  },
  endSession: () => {
    set({ signedIn: false, lastSignInAt: null });
    if (isLive())
      void loadActions()
        .signOutOfSupabase("local")
        .catch(() => undefined);
  },
}));

/**
 * Live mode: mirrors the Supabase session into the store. Restores the stored session at start
 * (AUTH-5) and follows sign-in, token refresh and sign-out, including a refresh token that
 * Supabase rejects. Returns the unsubscribe function.
 */
export function startSessionSync(): () => void {
  const auth = loadSupabase().getSupabase().auth;
  const { data } = auth.onAuthStateChange((event, session) => {
    if (session) {
      useSession.setState({
        ready: true,
        signedIn: true,
        lastSignInAt: session.user.last_sign_in_at ?? new Date().toISOString(),
      });
    } else if (event === "INITIAL_SESSION") {
      void restoreWithoutNetwork();
    } else {
      useSession.setState({ ready: true, signedIn: false, lastSignInAt: null });
    }
  });
  return () => data.subscription.unsubscribe();
}

/**
 * Supabase reports "no session" at start when the stored access token has expired and the refresh
 * could not reach the server. That is not a sign-out: the gym often has poor reception. Keep the
 * user signed in; requests fail with the normal error state until a refresh succeeds.
 */
async function restoreWithoutNetwork() {
  const { data, error } = await loadSupabase().getSupabase().auth.getSession();
  const offline = !data.session && error !== null && loadActions().isRetryableAuthError(error);
  useSession.setState({
    ready: true,
    signedIn: Boolean(data.session) || offline,
    lastSignInAt: data.session?.user.last_sign_in_at ?? null,
  });
}

/** DEL-1: account deletion needs a sign-in within the last 10 minutes. */
export const RECENT_SIGN_IN_MINUTES = 10;

export function hasRecentSignIn(lastSignInAt: string | null, now: Date): boolean {
  if (!lastSignInAt) return false;
  return now.getTime() - new Date(lastSignInAt).getTime() <= RECENT_SIGN_IN_MINUTES * 60_000;
}
