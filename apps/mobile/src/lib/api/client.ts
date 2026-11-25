import Constants from "expo-constants";
import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "./schema";

export const appVersionMiddleware: Middleware = {
  onRequest({ request }) {
    request.headers.set("X-App-Version", Constants.expoConfig?.version ?? "0.0.0");
    return request;
  },
};

/** What the API client needs from the session (SPEC 4.3 in architecture.md). */
export interface AuthHooks {
  getToken(): Promise<string | null>;
  /** A new token, null when the session is gone; throws when offline. */
  refresh(): Promise<string | null>;
  onSignedOut(): void;
}

/**
 * Adds the access token. On 401 it refreshes once and retries once; if that fails or the retry is
 * still 401 the user is signed out.
 */
export function createAuthFetch(
  hooks: AuthHooks,
  baseFetch: (request: Request) => Promise<Response> = (request) => globalThis.fetch(request),
) {
  return async (request: Request): Promise<Response> => {
    const retry = request.clone();
    const token = await hooks.getToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);

    const response = await baseFetch(request);
    if (response.status !== 401) return response;

    let fresh: string | null;
    try {
      fresh = await hooks.refresh();
    } catch {
      return response; // offline: keep the session, the caller sees the 401
    }
    if (!fresh) {
      hooks.onSignedOut();
      return response;
    }
    retry.headers.set("Authorization", `Bearer ${fresh}`);
    const second = await baseFetch(retry);
    if (second.status === 401) hooks.onSignedOut();
    return second;
  };
}

export function createApiClient(
  baseUrl: string = process.env.EXPO_PUBLIC_API_URL ?? "",
  fetch?: (request: Request) => Promise<Response>,
  auth?: AuthHooks,
) {
  const client = createClient<paths>({
    baseUrl,
    fetch: auth ? createAuthFetch(auth, fetch) : fetch,
  });
  client.use(appVersionMiddleware);
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

let shared: ApiClient | undefined;
let authHooks: AuthHooks | undefined;

/** Called once at start in live mode, before the first request. */
export function configureApiAuth(hooks: AuthHooks | undefined) {
  authHooks = hooks;
  shared = undefined;
}

/** Shared client for live implementations. Created lazily so tests can set env first. */
export function getApiClient(): ApiClient {
  shared ??= createApiClient(undefined, undefined, authHooks);
  return shared;
}
