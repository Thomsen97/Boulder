import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { getDb } from "@/lib/mock/db";
import { renderWithProviders } from "@/test/helpers";

import { GUIDELINES_VERSION } from "./guidelines";
import { OnboardingScreen } from "./screens/OnboardingScreen";

const submit = () => screen.getByRole("button", { name: "Kom i gang" });

async function fillValid(username = "klatrer1") {
  await fireEvent.changeText(screen.getByLabelText("Brukernavn"), username);
  await fireEvent.changeText(screen.getByLabelText("Navn"), "Kari Klatrer");
  await fireEvent.press(screen.getByRole("checkbox", { name: "Jeg er 16 år eller eldre" }));
  await fireEvent.press(
    screen.getByRole("checkbox", { name: "Jeg har lest og godtar retningslinjene" }),
  );
}

describe("onboarding (AUTH-3)", () => {
  it("shows the fields, the guidelines and a disabled submit button", async () => {
    await renderWithProviders(<OnboardingScreen />);

    expect(screen.getByLabelText("Brukernavn")).toBeTruthy();
    expect(screen.getByLabelText("Navn")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Jeg er 16 år eller eldre" })).toBeTruthy();
    expect(screen.getByText("Retningslinjer for fellesskapet")).toBeTruthy();
    expect(screen.getByText(/Ikke film eller del andre/)).toBeTruthy();
    expect(submit()).toBeDisabled();
  });

  it("checks the username live and enables submit once everything is valid", async () => {
    await renderWithProviders(<OnboardingScreen />);
    await fillValid();

    expect(await screen.findByText("Brukernavnet er ledig")).toBeTruthy();
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it("reports a taken username and keeps submit disabled", async () => {
    await renderWithProviders(<OnboardingScreen />);
    await fillValid("Emma");

    expect(await screen.findByText("Brukernavnet er opptatt")).toBeTruthy();
    expect(submit()).toBeDisabled();
  });

  it.each([
    ["ab", "Brukernavnet må ha minst 3 tegn."],
    ["1abc", "Brukernavnet må starte med en bokstav."],
    ["ab cd", "Bruk bare små bokstaver, tall, punktum og understrek."],
    ["admin", "Dette brukernavnet er reservert."],
  ])("explains why %s is not allowed, without asking the server", async (name, message) => {
    await renderWithProviders(<OnboardingScreen />);
    await fireEvent.changeText(screen.getByLabelText("Brukernavn"), name);

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText("Sjekker om brukernavnet er ledig …")).toBeNull();
  });

  it("keeps submit disabled until the age and guidelines boxes are checked", async () => {
    await renderWithProviders(<OnboardingScreen />);
    await fireEvent.changeText(screen.getByLabelText("Brukernavn"), "klatrer1");
    await fireEvent.changeText(screen.getByLabelText("Navn"), "Kari Klatrer");
    await screen.findByText("Brukernavnet er ledig");
    expect(submit()).toBeDisabled();

    await fireEvent.press(screen.getByRole("checkbox", { name: "Jeg er 16 år eller eldre" }));
    expect(submit()).toBeDisabled();

    await fireEvent.press(
      screen.getByRole("checkbox", { name: "Jeg har lest og godtar retningslinjene" }),
    );
    await waitFor(() => expect(submit()).toBeEnabled());
  });

  it("creates the profile and stores the accepted guidelines version", async () => {
    await renderWithProviders(<OnboardingScreen />);
    await fillValid();
    await screen.findByText("Brukernavnet er ledig");
    await waitFor(() => expect(submit()).toBeEnabled());

    await act(async () => {
      await fireEvent.press(submit());
    });

    await waitFor(() => expect(getDb().me.onboardingComplete).toBe(true));
    expect(getDb().me.username).toBe("klatrer1");
    expect(getDb().me.displayName).toBe("Kari Klatrer");
    expect(getDb().me.guidelinesVersion).toBe(GUIDELINES_VERSION);
  });
});
