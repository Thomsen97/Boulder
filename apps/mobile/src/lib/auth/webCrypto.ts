import * as ExpoCrypto from "expo-crypto";

/**
 * Hermes has no global WebCrypto. Without it Supabase's PKCE falls back to a `Math.random`
 * verifier and the `plain` challenge method, which leaves the code on the custom-scheme redirect
 * unprotected. This installs `getRandomValues` and `subtle.digest` (SHA-256) from expo-crypto.
 */
export function ensureWebCrypto(): void {
  const scope = globalThis as unknown as { crypto?: Record<string, unknown> };
  const existing = scope.crypto;
  if (existing && typeof existing.getRandomValues === "function" && existing.subtle) return;

  const subtle = {
    digest: (algorithm: string | { name: string }, data: BufferSource) => {
      const name = typeof algorithm === "string" ? algorithm : algorithm.name;
      if (name.toUpperCase() !== "SHA-256") {
        return Promise.reject(new Error(`Unsupported digest algorithm: ${name}`));
      }
      return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
    },
  };

  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    writable: true,
    value: { ...existing, getRandomValues: ExpoCrypto.getRandomValues, subtle },
  });
}
