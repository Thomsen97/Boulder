import { createApiClient } from "@/lib/api/client";
import { createLiveHealthApi, type HealthApi } from "@/features/health/api";
import { createMockHealthApi } from "@/features/health/mock";

function textResponse(body: string, status: number) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain" } });
}

describe("HealthApi through the same interface", () => {
  const fetchMock = jest.fn<Promise<Response>, [Request]>();
  const live: HealthApi = createLiveHealthApi(() => createApiClient("http://api.test", fetchMock));
  const mock: HealthApi = createMockHealthApi();

  beforeEach(() => fetchMock.mockReset());

  it("mock mode returns Healthy", async () => {
    await expect(mock.getHealth()).resolves.toBe("Healthy");
  });

  it("live mode returns Healthy and sends X-App-Version", async () => {
    fetchMock.mockResolvedValue(textResponse("Healthy", 200));
    await expect(live.getHealth()).resolves.toBe("Healthy");

    const request = fetchMock.mock.calls[0][0];
    expect(request.url).toBe("http://api.test/health");
    expect(request.headers.get("X-App-Version")).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("live mode maps a 503 answer to Unhealthy", async () => {
    fetchMock.mockResolvedValue(textResponse("Unhealthy", 503));
    await expect(live.getHealth()).resolves.toBe("Unhealthy");
  });

  it("live mode rejects when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await expect(live.getHealth()).rejects.toThrow();
  });
});
