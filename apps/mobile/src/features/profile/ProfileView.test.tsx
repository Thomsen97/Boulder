import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { getDb } from "@/lib/mock/db";
import { renderWithProviders, signInOnboarded } from "@/test/helpers";

import { OwnProfileScreen } from "./screens/OwnProfileScreen";
import { UserProfileScreen } from "./screens/UserProfileScreen";

// Mock users (src/lib/mock/db.ts): emma is public and not followed, ola public and followed,
// kari private and not followed, nina private with a pending request, jonas private and
// followed, troll is blocked.

beforeEach(() => signInOnboarded());

describe("profile states", () => {
  it("own profile: shows own header, content and edit and settings actions", async () => {
    await renderWithProviders(<OwnProfileScreen />);

    expect(await screen.findByText("Test Testesen")).toBeTruthy();
    expect(screen.getByText("@tester")).toBeTruthy();
    expect(screen.getByText("Liker overheng.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rediger profil" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Innstillinger" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Ingen innlegg ennå")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Følg" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Blokker brukeren" })).toBeNull();
  });

  it("public other: shows content and a follow button", async () => {
    await renderWithProviders(<UserProfileScreen username="emma" />);

    expect(await screen.findByText("Emma Berg")).toBeTruthy();
    expect(screen.getByText("Ingen innlegg ennå")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Følg" })).toBeTruthy();
    expect(screen.queryByText("Denne profilen er privat")).toBeNull();
    expect(screen.queryByRole("button", { name: "Rediger profil" })).toBeNull();
  });

  it("private other, not followed: header is visible, content is hidden", async () => {
    await renderWithProviders(<UserProfileScreen username="kari" />);

    expect(await screen.findByText("Kari Hansen")).toBeTruthy();
    expect(screen.getByText("Privat profil")).toBeTruthy();
    expect(screen.getByText("Denne profilen er privat")).toBeTruthy();
    expect(screen.queryByText("Ingen innlegg ennå")).toBeNull();
    expect(screen.getByRole("button", { name: "Be om å følge" })).toBeTruthy();
  });

  it("pending request: shows the request status and lets the user cancel it", async () => {
    await renderWithProviders(<UserProfileScreen username="nina" />);

    expect(await screen.findByText("Nina Olsen")).toBeTruthy();
    expect(screen.getByText("Forespørsel sendt")).toBeTruthy();
    expect(screen.getByText("Denne profilen er privat")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Avbryt forespørsel" }));

    expect(await screen.findByRole("button", { name: "Be om å følge" })).toBeTruthy();
    expect(screen.queryByText("Forespørsel sendt")).toBeNull();
  });

  it("followed: shows content and lets the user unfollow", async () => {
    await renderWithProviders(<UserProfileScreen username="jonas" />);

    expect(await screen.findByText("Jonas Lie")).toBeTruthy();
    expect(screen.getByText("Følger")).toBeTruthy();
    expect(screen.getByText("Ingen innlegg ennå")).toBeTruthy();
    expect(screen.queryByText("Denne profilen er privat")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Slutt å følge" }));

    // Jonas is private, so unfollowing hides the content again (PROF-5).
    expect(await screen.findByText("Denne profilen er privat")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Be om å følge" })).toBeTruthy();
  });

  it("blocked: looks exactly like a user that does not exist", async () => {
    await renderWithProviders(<UserProfileScreen username="troll" />);
    expect(await screen.findByText("Fant ikke brukeren")).toBeTruthy();
    expect(screen.queryByText("Trollet")).toBeNull();
    const blockedView = JSON.stringify(screen.toJSON());

    await screen.unmount();
    await renderWithProviders(<UserProfileScreen username="finnesikke" />);
    expect(await screen.findByText("Fant ikke brukeren")).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).toBe(blockedView);
  });
});

describe("profile actions", () => {
  it("following a public profile is immediate", async () => {
    await renderWithProviders(<UserProfileScreen username="emma" />);
    await fireEvent.press(await screen.findByRole("button", { name: "Følg" }));

    expect(await screen.findByText("Følger")).toBeTruthy();
    expect(getDb().following.has("user-emma")).toBe(true);
  });

  it("blocking asks for confirmation and then hides the profile", async () => {
    await renderWithProviders(<UserProfileScreen username="emma" />);
    await fireEvent.press(await screen.findByRole("button", { name: "Blokker brukeren" }));

    expect(await screen.findByText("Blokkere @emma?")).toBeTruthy();
    expect(getDb().blocked.has("user-emma")).toBe(false);

    await fireEvent.press(screen.getByRole("button", { name: "Blokker" }));

    expect(await screen.findByText("Fant ikke brukeren")).toBeTruthy();
    expect(getDb().blocked.has("user-emma")).toBe(true);
  });

  it("cancelling the block dialog changes nothing", async () => {
    await renderWithProviders(<UserProfileScreen username="emma" />);
    await fireEvent.press(await screen.findByRole("button", { name: "Blokker brukeren" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Avbryt" }));

    await waitFor(() => expect(screen.queryByText("Blokkere @emma?")).toBeNull());
    expect(getDb().blocked.has("user-emma")).toBe(false);
  });
});
