import { router } from "expo-router";
import { act, fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { mockControl } from "@/lib/mock/control";
import { signInOnboarded } from "@/test/helpers";
import { useSession } from "@/features/session/store";

// Phase 2 "Done when": every screen is reachable. Each route is opened by URL through the real
// router and root layout, including the sign-in and onboarding guards.

describe("route guards", () => {
  it("shows the welcome screen when signed out, even for a deep link", async () => {
    await renderRouter("./app", { initialUrl: "/settings" });

    expect(await screen.findByRole("button", { name: "Fortsett med Apple" })).toBeTruthy();
    expect(screen.queryByText("Innstillinger")).toBeNull();
  });

  it("goes from welcome to onboarding for a new user", async () => {
    await renderRouter("./app", { initialUrl: "/" });
    await fireEvent.press(await screen.findByRole("button", { name: "Fortsett med Apple" }));

    expect(await screen.findByRole("header", { name: "Velkommen!" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kom i gang" })).toBeTruthy();
  });

  it("keeps a signed-in user without a profile in onboarding", async () => {
    useSession.getState().signIn();
    await renderRouter("./app", { initialUrl: "/settings" });

    expect(await screen.findByRole("header", { name: "Velkommen!" })).toBeTruthy();
    expect(screen.queryByText("Innstillinger")).toBeNull();
  });
});

describe("screens", () => {
  beforeEach(() => signInOnboarded());

  // Each route is identified by the heading of its own screen, not by text other screens share.
  it.each([
    ["/", "Hjem"],
    ["/groups", "Grupper"],
    ["/gym", "Gym"],
    ["/notifications", "Varsler"],
    ["/profile", "Profil"],
    ["/user/emma", "Emma Berg"],
    ["/edit-profile", "Rediger profil"],
    ["/settings", "Innstillinger"],
    ["/settings/follow-requests", "Følgeforespørsler"],
    ["/settings/blocked", "Blokkerte brukere"],
    ["/settings/delete-account", "Slett konto"],
  ])("opens %s", async (url, heading) => {
    await renderRouter("./app", { initialUrl: url });

    expect(await screen.findByRole("header", { name: heading })).toBeTruthy();
  });

  it("opens an unknown profile as 'not found'", async () => {
    await renderRouter("./app", { initialUrl: "/user/finnesikke" });

    expect(await screen.findByText("Fant ikke brukeren")).toBeTruthy();
  });
});

describe("failed background refresh", () => {
  afterEach(() => jest.useRealTimers());

  it("keeps the navigator and the open screen when refetching the profile fails", async () => {
    signInOnboarded();
    await renderRouter("./app", { initialUrl: "/" });
    expect((await screen.findAllByText("Hjem")).length).toBeGreaterThan(0);

    // Make the cached profile stale, then let its refetch (and the one retry) fail.
    jest.useFakeTimers({
      now: Date.now() + 120_000,
      doNotFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "setImmediate",
        "clearImmediate",
        "nextTick",
        "queueMicrotask",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    });
    mockControl.failNext = 2;
    await act(async () => {
      router.push("/edit-profile");
    });

    await waitFor(() => expect(mockControl.failNext).toBe(0), { timeout: 4000 });
    expect(await screen.findByRole("header", { name: "Rediger profil" })).toBeTruthy();
    expect(screen.getByLabelText("Navn")).toBeTruthy();
  });
});
