import { AuthRetryableFetchError, type Session, type SupabaseClient } from "@supabase/supabase-js";

import { createAuthFetch } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/actions";
import { resetSupabaseForTests } from "@/lib/auth/supabase";

import { startSessionSync, useSession } from "./store";

// Live mode with a fake Supabase client that behaves like the real one for the parts we use.
function createFakeSupabase() {
  let sessionError: unknown = null;
  let listener: ((event: string, session: Session | null) => void) | undefined;
  let current: Session | null = null;
  const signOut = jest.fn(async () => {
    current = null;
    listener?.("SIGNED_OUT", null);
    return { error: null };
  });
  const client = {
    auth: {
      onAuthStateChange: (cb: typeof listener) => {
        listener = cb;
        // Like Supabase: the stored session is reported right away.
        setTimeout(() => cb?.("INITIAL_SESSION", current), 0);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
      getSession: async () => ({ data: { session: current }, error: sessionError }),
      signOut,
    },
  } as unknown as SupabaseClient;
  return {
    client,
    signOut,
    store: (session: Session | null) => (current = session),
    failSession: (error: unknown) => (sessionError = error),
    emit: (event: string, session: Session | null) => {
      current = session;
      listener?.(event, session);
    },
  };
}

const session = (token: string, lastSignInAt = "2026-10-13T10:00:00Z") =>
  ({ access_token: token, user: { last_sign_in_at: lastSignInAt } }) as unknown as Session;

describe("live session (AUTH-5)", () => {
  const original = process.env.EXPO_PUBLIC_API_MODE;
  let fake: ReturnType<typeof createFakeSupabase>;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_MODE = "live";
    fake = createFakeSupabase();
    resetSupabaseForTests(fake.client);
    useSession.setState({ ready: false, signedIn: false, lastSignInAt: null });
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_MODE = original;
    resetSupabaseForTests(undefined);
  });

  it("restores a stored session after an app restart", async () => {
    fake.store(session("stored-token"));
    const stop = startSessionSync();
    expect(useSession.getState().ready).toBe(false);

    await new Promise((r) => setTimeout(r, 5));

    expect(useSession.getState()).toMatchObject({
      ready: true,
      signedIn: true,
      lastSignInAt: "2026-10-13T10:00:00Z",
    });
    stop();
  });

  it("is signed out and ready when nothing is stored", async () => {
    startSessionSync();
    await new Promise((r) => setTimeout(r, 5));
    expect(useSession.getState()).toMatchObject({ ready: true, signedIn: false });
  });

  it("follows a sign-in", async () => {
    startSessionSync();
    fake.emit("SIGNED_IN", session("token-1"));
    expect(useSession.getState().signedIn).toBe(true);
  });

  it("sign-out revokes the session and the old token is not sent again", async () => {
    startSessionSync();
    fake.emit("SIGNED_IN", session("old-token"));

    const sent: (string | null)[] = [];
    const call = createAuthFetch(
      {
        getToken: getAccessToken,
        refresh: async () => null,
        onSignedOut: () => undefined,
      },
      async (request) => {
        sent.push(request.headers.get("Authorization"));
        return new Response("{}", { status: 200 });
      },
    );
    await call(new Request("http://api.test/api/v1/me"));
    expect(sent.at(-1)).toBe("Bearer old-token");

    useSession.getState().signOut();
    await new Promise((r) => setTimeout(r, 5));

    expect(fake.signOut).toHaveBeenCalledTimes(1);
    expect(useSession.getState().signedIn).toBe(false);
    await call(new Request("http://api.test/api/v1/me"));
    expect(sent.at(-1)).toBeNull();
  });

  it("signs out when Supabase drops the session (rejected refresh token)", async () => {
    startSessionSync();
    fake.emit("SIGNED_IN", session("token-1"));
    fake.emit("SIGNED_OUT", null);
    expect(useSession.getState()).toMatchObject({ signedIn: false, lastSignInAt: null });
  });

  it("an automatic sign-out only clears this device", async () => {
    startSessionSync();
    fake.emit("SIGNED_IN", session("token-1"));

    useSession.getState().endSession();
    await new Promise((r) => setTimeout(r, 5));

    expect(useSession.getState().signedIn).toBe(false);
    expect(fake.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("a user sign-out revokes the session on the server", async () => {
    startSessionSync();
    fake.emit("SIGNED_IN", session("token-1"));

    useSession.getState().signOut();
    await new Promise((r) => setTimeout(r, 5));

    expect(fake.signOut).toHaveBeenCalledWith();
  });

  it("stays signed in when the app starts offline with an expired access token", async () => {
    // Supabase reports INITIAL_SESSION with null when its refresh could not reach the server.
    fake.failSession(new AuthRetryableFetchError("fetch failed", 0));
    startSessionSync();
    await new Promise((r) => setTimeout(r, 5));

    expect(useSession.getState()).toMatchObject({ ready: true, signedIn: true });
  });

  it("signs out at start when the stored session is really gone", async () => {
    startSessionSync();
    await new Promise((r) => setTimeout(r, 5));
    expect(useSession.getState()).toMatchObject({ ready: true, signedIn: false });
  });
});
