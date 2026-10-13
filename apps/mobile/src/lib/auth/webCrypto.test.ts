import { createClient } from "@supabase/supabase-js";

import { ensureWebCrypto } from "./webCrypto";

// The native module is not available in Jest; Node's own implementation stands in for it.
jest.mock("expo-crypto", () => {
  const { webcrypto } = jest.requireActual<typeof import("node:crypto")>("node:crypto");
  return {
    CryptoDigestAlgorithm: { SHA256: "SHA-256" },
    getRandomValues: (array: never) => webcrypto.getRandomValues(array),
    digest: (algorithm: string, data: never) => webcrypto.subtle.digest(algorithm, data),
  };
});

// Hermes has no global crypto; Jest runs on Node, which does. Remove it to reproduce the device.
describe("ensureWebCrypto (PKCE on Hermes)", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");

  beforeEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "crypto", original);
  });

  it("installs getRandomValues and a SHA-256 digest when crypto is missing", async () => {
    expect(typeof crypto).toBe("undefined");
    ensureWebCrypto();

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    expect(bytes.some((b) => b !== 0)).toBe(true);

    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("abc"));
    const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
    expect(hex).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("makes Supabase use an S256 challenge, not the verifier itself", async () => {
    ensureWebCrypto();
    const storage = new Map<string, string>();
    const client = createClient("http://supabase.test", "key", {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: false,
        storage: {
          getItem: (k) => storage.get(k) ?? null,
          setItem: (k, v) => void storage.set(k, v),
          removeItem: (k) => void storage.delete(k),
        },
      },
    });
    const { data } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { skipBrowserRedirect: true, redirectTo: "boulder://auth/callback" },
    });

    const url = new URL(data.url ?? "");
    const verifier = [...storage.entries()].find(([k]) => k.endsWith("-code-verifier"))?.[1] ?? "";
    expect(url.searchParams.get("code_challenge_method")).toBe("s256");
    expect(url.searchParams.get("code_challenge")).not.toBe(verifier.split("/")[0]);
    expect(verifier.length).toBeGreaterThan(40);
  });
});
