import Constants from "expo-constants";
import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "./schema";

export const appVersionMiddleware: Middleware = {
  onRequest({ request }) {
    request.headers.set("X-App-Version", Constants.expoConfig?.version ?? "0.0.0");
    return request;
  },
};

export function createApiClient(
  baseUrl: string = process.env.EXPO_PUBLIC_API_URL ?? "",
  fetch?: (request: Request) => Promise<Response>,
) {
  const client = createClient<paths>({ baseUrl, fetch });
  client.use(appVersionMiddleware);
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

let shared: ApiClient | undefined;

/** Shared client for live implementations. Created lazily so tests can set env first. */
export function getApiClient(): ApiClient {
  shared ??= createApiClient();
  return shared;
}
