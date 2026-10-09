import { ApiError } from "@/lib/api/errors";
import { getDb } from "@/lib/mock/db";

import { createMockProfileApi } from "./mock";

// The mock stands in for the API until phase 3, so it has to enforce the same rules.

const completeOnboarding = (api: ReturnType<typeof createMockProfileApi>) =>
  api.completeOnboarding({
    username: "tester",
    displayName: "Test",
    ageConfirmed: true,
    guidelinesVersion: "v1",
  });

describe("mock profile API", () => {
  it("accepts every pending follow request when the profile goes public (5.6)", async () => {
    const api = createMockProfileApi();
    await completeOnboarding(api);
    await api.updateMe({ isPrivate: true });
    expect(getDb().incomingRequests.size).toBe(2);

    await api.updateMe({ isPrivate: false });

    expect(getDb().incomingRequests.size).toBe(0);
    expect(getDb().followers.has("user-lars")).toBe(true);
    expect(getDb().followers.has("user-mia")).toBe(true);
  });

  it("allows one username change per 30 days (AUTH-4)", async () => {
    const t0 = new Date("2026-10-01T12:00:00Z");
    const api = createMockProfileApi(() => t0);
    await completeOnboarding(api);

    await api.updateMe({ username: "tester2" });
    await expect(api.updateMe({ username: "tester3" })).rejects.toMatchObject({
      status: 409,
      code: "username_change_too_soon",
    });

    const later = createMockProfileApi(() => new Date("2026-11-01T12:00:00Z"));
    await expect(later.updateMe({ username: "tester3" })).resolves.toMatchObject({
      username: "tester3",
    });
  });

  it("rejects a taken, reserved or malformed username", async () => {
    const api = createMockProfileApi();
    await completeOnboarding(api);

    await expect(api.updateMe({ username: "emma" })).rejects.toMatchObject({ status: 409 });
    await expect(api.updateMe({ username: "admin" })).rejects.toMatchObject({ status: 400 });
    await expect(api.updateMe({ username: "1abc" })).rejects.toBeInstanceOf(ApiError);
  });

  it("enforces the display name and bio limits", async () => {
    const api = createMockProfileApi();
    await completeOnboarding(api);

    await expect(api.updateMe({ displayName: "  " })).rejects.toMatchObject({ status: 400 });
    await expect(api.updateMe({ displayName: "x".repeat(51) })).rejects.toMatchObject({
      status: 400,
    });
    await expect(api.updateMe({ bio: "x".repeat(161) })).rejects.toMatchObject({ status: 400 });
    await expect(api.updateMe({ bio: "x".repeat(160) })).resolves.toBeDefined();
  });

  it("counts the real followers on the own profile", async () => {
    const api = createMockProfileApi();
    await completeOnboarding(api);

    expect((await api.getProfile("tester")).followerCount).toBe(3);
  });
});
