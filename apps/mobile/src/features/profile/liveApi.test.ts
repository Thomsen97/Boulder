import { createApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import { createLiveProfileApi, toMe } from "./api";

const problem = (status: number, code: string) =>
  new Response(JSON.stringify({ status, code }), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const fullMe = {
  onboardingComplete: true,
  status: "active",
  id: "0199aaaa-0000-7000-8000-000000000001",
  username: "sebastian",
  displayName: "Sebastian",
  bio: null,
  avatarUrl: null,
  isPrivate: false,
  shareAscents: true,
  spoilerMode: "projects",
  usernameChangedAt: null,
  guidelinesVersion: "1",
};

describe("live ProfileApi", () => {
  const fetchMock = jest.fn<Promise<Response>, [Request]>();
  const api = createLiveProfileApi(() => createApiClient("http://api.test", fetchMock));

  beforeEach(() => fetchMock.mockReset());

  it("maps GET /me for an onboarded user", async () => {
    fetchMock.mockResolvedValue(json(fullMe));
    await expect(api.getMe()).resolves.toMatchObject({
      username: "sebastian",
      bio: "",
      spoilerMode: "projects",
      onboardingComplete: true,
    });
    expect(fetchMock.mock.calls[0][0].url).toBe("http://api.test/api/v1/me");
  });

  it("maps GET /me for a user who has not finished onboarding", () => {
    const me = toMe({
      onboardingComplete: false,
      status: "active",
      id: null,
      username: null,
      displayName: null,
      bio: null,
      avatarUrl: null,
      isPrivate: null,
      shareAscents: null,
      spoilerMode: null,
      usernameChangedAt: null,
      guidelinesVersion: null,
    });
    expect(me).toMatchObject({ onboardingComplete: false, username: "", displayName: "" });
  });

  it("turns an error answer into an ApiError with the ProblemDetails code", async () => {
    fetchMock.mockResolvedValue(problem(409, "username_taken"));
    await expect(
      api.completeOnboarding({
        username: "emma",
        displayName: "Emma",
        ageConfirmed: true,
        guidelinesVersion: "1",
      }),
    ).rejects.toMatchObject({ status: 409, code: "username_taken" });
  });

  it("surfaces onboarding_required as an ApiError", async () => {
    fetchMock.mockResolvedValue(problem(403, "onboarding_required"));
    const error = await api.updateMe({ bio: "x" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: "onboarding_required" });
  });

  it("maps the availability reason", async () => {
    fetchMock.mockResolvedValue(json({ available: false, reason: "reserved" }));
    await expect(api.checkUsername("admin")).resolves.toEqual({
      available: false,
      reason: "reserved",
    });
    expect(fetchMock.mock.calls[0][0].url).toBe(
      "http://api.test/api/v1/usernames/admin/availability",
    );
  });

  it("a hidden profile is a 404 ApiError", async () => {
    fetchMock.mockResolvedValue(problem(404, "not_found"));
    await expect(api.getProfile("nobody")).rejects.toMatchObject({ status: 404 });
  });

  it("maps a visible profile, converting the counts to numbers", async () => {
    fetchMock.mockResolvedValue(
      json({
        id: "0199aaaa-0000-7000-8000-000000000002",
        username: "emma",
        displayName: "Emma Berg",
        bio: "Liker overheng.",
        avatarUrl: null,
        isPrivate: false,
        isOwn: false,
        followerCount: "12",
        followingCount: 3,
        followState: "pending",
        canViewContent: true,
      }),
    );
    await expect(api.getProfile("emma")).resolves.toMatchObject({
      followerCount: 12,
      followingCount: 3,
      followState: "pending",
      canViewContent: true,
    });
  });

  it("delete account is not available until phase 21", async () => {
    await expect(api.deleteAccount("emma")).rejects.toMatchObject({
      status: 501,
      code: "not_implemented",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
