import { create } from "zustand";

import { signOutOfSupabase } from "@/lib/auth/actions";
import { getSupabase } from "@/lib/auth/supabase";
import { getApiMode } from "@/lib/api/mode";

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
}

export const useSession = create<SessionState>((set) => ({
  ready: !isLive(),
  signedIn: false,
  lastSignInAt: null,
  signIn: (now = new Date()) => set({ signedIn: true, lastSignInAt: now.toISOString() }),
  signOut: () => {
    set({ signedIn: false, lastSignInAt: null });
    if (isLive()) void signOutOfSupabase().catch(() => undefined);
  },
}));

/**
 * Live mode: mirrors the Supabase session into the store. Restores the stored session at start
 * (AUTH-5) and follows sign-in, token refresh and sign-out, including a refresh token that
 * Supabase rejects. Returns the unsubscribe function.
 */
export function startSessionSync(): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    useSession.setState(
      session
        ? {
            ready: true,
            signedIn: true,
            lastSignInAt: session.user.last_sign_in_at ?? new Date().toISOString(),
          }
        : { ready: true, signedIn: false, lastSignInAt: null },
    );
  });
  return () => data.subscription.unsubscribe();
}

/** DEL-1: account deletion needs a sign-in within the last 10 minutes. */
export const RECENT_SIGN_IN_MINUTES = 10;

export function hasRecentSignIn(lastSignInAt: string | null, now: Date): boolean {
  if (!lastSignInAt) return false;
  return now.getTime() - new Date(lastSignInAt).getTime() <= RECENT_SIGN_IN_MINUTES * 60_000;
}
