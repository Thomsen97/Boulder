import { create } from "zustand";

// Mock session for the UI-first phases. Phase 4 replaces it with the Supabase session; the
// shape (signed in or not, time of the last sign-in) is what the screens depend on.
interface SessionState {
  signedIn: boolean;
  /** ISO time of the last interactive sign-in, used by the delete-account re-authentication. */
  lastSignInAt: string | null;
  signIn: (now?: Date) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>((set) => ({
  signedIn: false,
  lastSignInAt: null,
  signIn: (now = new Date()) => set({ signedIn: true, lastSignInAt: now.toISOString() }),
  signOut: () => set({ signedIn: false, lastSignInAt: null }),
}));

/** DEL-1: account deletion needs a sign-in within the last 10 minutes. */
export const RECENT_SIGN_IN_MINUTES = 10;

export function hasRecentSignIn(lastSignInAt: string | null, now: Date): boolean {
  if (!lastSignInAt) return false;
  return now.getTime() - new Date(lastSignInAt).getTime() <= RECENT_SIGN_IN_MINUTES * 60_000;
}
