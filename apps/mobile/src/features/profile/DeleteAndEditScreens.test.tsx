import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { hasRecentSignIn, useSession } from "@/features/session/store";
import { getDb } from "@/lib/mock/db";
import { renderWithProviders, signInOnboarded } from "@/test/helpers";

import { DeleteAccountScreen } from "./screens/DeleteAccountScreen";
import { EditProfileScreen } from "./screens/EditProfileScreen";

let back: jest.SpyInstance;

beforeEach(() => {
  signInOnboarded();
  back = jest.spyOn(router, "back").mockImplementation(() => {});
});

afterEach(() => back.mockRestore());

describe("delete account (DEL-1, UI only)", () => {
  it("keeps the delete button disabled until the username is typed", async () => {
    await renderWithProviders(<DeleteAccountScreen />);

    const button = await screen.findByRole("button", { name: "Slett kontoen min" });
    expect(button).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("Brukernavn"), "feil");
    expect(screen.getByRole("button", { name: "Slett kontoen min" })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("Brukernavn"), "tester");
    expect(screen.getByRole("button", { name: "Slett kontoen min" })).toBeEnabled();
  });

  it("deletes the account, signs out and frees the username", async () => {
    await renderWithProviders(<DeleteAccountScreen />);
    await screen.findByRole("button", { name: "Slett kontoen min" });
    await fireEvent.changeText(screen.getByLabelText("Brukernavn"), "tester");
    await fireEvent.press(screen.getByRole("button", { name: "Slett kontoen min" }));

    await waitFor(() => expect(useSession.getState().signedIn).toBe(false));
    expect(getDb().me.onboardingComplete).toBe(false);
    expect(getDb().me.username).toBe("");
  });

  it("asks for a new sign-in when the last one is older than 10 minutes", async () => {
    useSession.getState().signIn(new Date(Date.now() - 11 * 60_000));
    await renderWithProviders(<DeleteAccountScreen />);

    expect(await screen.findByRole("header", { name: "Logg inn på nytt" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Slett kontoen min" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Logg inn på nytt" }));
    expect(await screen.findByRole("button", { name: "Slett kontoen min" })).toBeTruthy();
  });
});

describe("hasRecentSignIn", () => {
  const now = new Date("2026-10-09T12:00:00Z");

  it("accepts a sign-in up to 10 minutes ago", () => {
    expect(hasRecentSignIn("2026-10-09T11:50:00Z", now)).toBe(true);
    expect(hasRecentSignIn("2026-10-09T11:49:59Z", now)).toBe(false);
  });

  it("rejects a missing sign-in", () => {
    expect(hasRecentSignIn(null, now)).toBe(false);
  });
});

describe("edit profile (PROF-1, AUTH-4)", () => {
  it("saves a new display name and bio", async () => {
    await renderWithProviders(<EditProfileScreen />);
    const name = await screen.findByLabelText("Navn");
    const save = () => screen.getByRole("button", { name: "Lagre" });
    expect(save()).toBeDisabled();

    await fireEvent.changeText(name, "Nytt Navn");
    await fireEvent.changeText(screen.getByLabelText("Bio"), "Ny bio");
    await waitFor(() => expect(save()).toBeEnabled());
    await fireEvent.press(save());

    await waitFor(() => expect(getDb().me.displayName).toBe("Nytt Navn"));
    expect(getDb().me.bio).toBe("Ny bio");
    await waitFor(() => expect(back).toHaveBeenCalled());
  });

  it("does not lock the username when only the display name changes", async () => {
    await renderWithProviders(<EditProfileScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Navn"), "Nytt Navn");
    await waitFor(() => expect(screen.getByRole("button", { name: "Lagre" })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: "Lagre" }));

    await waitFor(() => expect(getDb().me.displayName).toBe("Nytt Navn"));
    expect(getDb().me.usernameChangedAt).toBeNull();
    expect(screen.queryByText(/Du kan bytte brukernavn igjen/)).toBeNull();
  });

  it("limits the bio to 160 characters", async () => {
    await renderWithProviders(<EditProfileScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Bio"), "x".repeat(161));

    expect(await screen.findByText("Bioen kan ha maks 160 tegn.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lagre" })).toBeDisabled();
  });

  it("requires a display name", async () => {
    await renderWithProviders(<EditProfileScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Navn"), "  ");

    expect(await screen.findByText("Skriv inn et navn.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lagre" })).toBeDisabled();
  });

  it("changes the username after an availability check and records the change time", async () => {
    await renderWithProviders(<EditProfileScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Brukernavn"), "nytt.navn");

    expect(await screen.findByText("Brukernavnet er ledig")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("button", { name: "Lagre" })).toBeEnabled());
    await fireEvent.press(screen.getByRole("button", { name: "Lagre" }));

    await waitFor(() => expect(getDb().me.username).toBe("nytt.navn"));
    expect(getDb().me.usernameChangedAt).not.toBeNull();
  });

  it("does not allow a taken username", async () => {
    await renderWithProviders(<EditProfileScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Brukernavn"), "emma");

    expect(await screen.findByText("Brukernavnet er opptatt")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lagre" })).toBeDisabled();
  });

  it("locks the username for 30 days after a change", async () => {
    getDb().me.usernameChangedAt = new Date(Date.now() - 5 * 86_400_000).toISOString();
    await renderWithProviders(<EditProfileScreen />);

    const field = await screen.findByLabelText("Brukernavn");
    expect(field.props.editable).toBe(false);
    expect(screen.getByText(/Du kan bytte brukernavn igjen/)).toBeTruthy();
  });
});
