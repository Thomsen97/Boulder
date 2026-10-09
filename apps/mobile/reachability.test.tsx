import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

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

  it.each([
    ["/", "Hjem"],
    ["/groups", "Grupper"],
    ["/gym", "Gym"],
    ["/notifications", "Varsler"],
    ["/profile", "Test Testesen"],
    ["/user/emma", "Emma Berg"],
    ["/edit-profile", "Rediger profil"],
    ["/settings", "Innstillinger"],
    ["/settings/follow-requests", "Følgeforespørsler"],
    ["/settings/blocked", "Blokkerte brukere"],
    ["/settings/delete-account", "Slett konto"],
  ])("opens %s", async (url, text) => {
    await renderRouter("./app", { initialUrl: url });

    expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });

  it("opens an unknown profile as 'not found'", async () => {
    await renderRouter("./app", { initialUrl: "/user/finnesikke" });

    expect(await screen.findByText("Fant ikke brukeren")).toBeTruthy();
  });
});
