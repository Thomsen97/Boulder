import { createApiClient, createAuthFetch, type AuthHooks } from "./client";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("auth middleware", () => {
  const fetchMock = jest.fn<Promise<Response>, [Request]>();
  let token: string | null;
  let hooks: jest.Mocked<AuthHooks>;

  beforeEach(() => {
    fetchMock.mockReset();
    token = "token-1";
    hooks = {
      getToken: jest.fn(async () => token),
      refresh: jest.fn(async () => "token-2"),
      onSignedOut: jest.fn(),
    };
  });

  const send = (init?: RequestInit) =>
    createAuthFetch(hooks, fetchMock)(new Request("http://api.test/api/v1/me", init));

  it("adds the bearer token", async () => {
    fetchMock.mockResolvedValue(json({}));
    await send();
    expect(fetchMock.mock.calls[0][0].headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("sends no Authorization header without a session", async () => {
    token = null;
    fetchMock.mockResolvedValue(json({}));
    await send();
    expect(fetchMock.mock.calls[0][0].headers.has("Authorization")).toBe(false);
  });

  it("refreshes once on 401 and retries with the new token, including the body", async () => {
    fetchMock.mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({ ok: true }));
    const response = await send({ method: "POST", body: JSON.stringify({ a: 1 }) });

    expect(response.status).toBe(200);
    expect(hooks.refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retry = fetchMock.mock.calls[1][0];
    expect(retry.headers.get("Authorization")).toBe("Bearer token-2");
    expect(await retry.text()).toBe('{"a":1}');
    expect(hooks.onSignedOut).not.toHaveBeenCalled();
  });

  it("signs out when the refresh token is rejected", async () => {
    hooks.refresh.mockResolvedValue(null);
    fetchMock.mockResolvedValue(json({}, 401));
    const response = await send();

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(hooks.onSignedOut).toHaveBeenCalledTimes(1);
  });

  it("signs out when the retry is still 401, without a third attempt", async () => {
    fetchMock.mockResolvedValue(json({}, 401));
    const response = await send();

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(hooks.refresh).toHaveBeenCalledTimes(1);
    expect(hooks.onSignedOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the refresh fails because the phone is offline", async () => {
    hooks.refresh.mockRejectedValue(new TypeError("Network request failed"));
    fetchMock.mockResolvedValue(json({}, 401));
    const response = await send();

    expect(response.status).toBe(401);
    expect(hooks.onSignedOut).not.toHaveBeenCalled();
  });

  it("does not refresh for other error statuses", async () => {
    fetchMock.mockResolvedValue(json({ code: "onboarding_required" }, 403));
    await send();
    expect(hooks.refresh).not.toHaveBeenCalled();
  });

  it("is used by the generated client", async () => {
    fetchMock.mockResolvedValue(json({ onboardingComplete: false, status: "active" }));
    const client = createApiClient("http://api.test", fetchMock, hooks);
    await client.GET("/api/v1/me");
    expect(fetchMock.mock.calls[0][0].headers.get("Authorization")).toBe("Bearer token-1");
  });
});
