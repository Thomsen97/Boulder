import * as WebBrowser from "expo-web-browser";

import { signInWithGoogle } from "./actions";
import { resetSupabaseForTests } from "./supabase";

jest.mock("expo-linking", () => ({ createURL: (path: string) => `boulder://${path}` }));
jest.mock("expo-web-browser", () => ({ openAuthSessionAsync: jest.fn() }));

describe("signInWithGoogle", () => {
  const signInWithOAuth = jest.fn();
  const exchangeCodeForSession = jest.fn();

  beforeEach(() => {
    signInWithOAuth.mockReset().mockResolvedValue({
      data: { url: "https://project.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });
    exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
    resetSupabaseForTests({
      auth: { signInWithOAuth, exchangeCodeForSession },
    } as never);
  });
  afterEach(() => resetSupabaseForTests(undefined));

  it("always asks Google for the account chooser", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: "success",
      url: "boulder://auth/callback?code=abc",
    });
    await signInWithGoogle();

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: expect.objectContaining({ queryParams: { prompt: "select_account" } }),
      }),
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("reports a closed browser as cancelled", async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: "cancel" });
    await expect(signInWithGoogle()).rejects.toMatchObject({ kind: "cancelled" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
