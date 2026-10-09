import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { useSession } from "@/features/session/store";
import { getDb } from "@/lib/mock/db";
import { mockControl } from "@/lib/mock/control";
import { renderWithProviders, signInOnboarded } from "@/test/helpers";

import { SettingsScreen } from "./screens/SettingsScreen";

beforeEach(() => signInOnboarded());

describe("settings", () => {
  it("shows loading first, then the settings", async () => {
    mockControl.delayMs = 50;
    await renderWithProviders(<SettingsScreen />);
    expect(screen.getByRole("progressbar")).toBeTruthy();

    expect(await screen.findByText("Del loggene mine")).toBeTruthy();
    expect(screen.getByText("Privat profil")).toBeTruthy();
    expect(screen.getByText("Skjul beta")).toBeTruthy();
    expect(screen.getByText("Varselinnstillinger kommer snart")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Slett konto" })).toBeTruthy();
  });

  it("shows an error state with retry when loading fails", async () => {
    mockControl.failNext = 1;
    await renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("Noe gikk galt")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Prøv igjen" }));

    expect(await screen.findByText("Del loggene mine")).toBeTruthy();
  });

  it("making a private profile private needs no confirmation", async () => {
    await renderWithProviders(<SettingsScreen />);
    await fireEvent(await screen.findByLabelText("Privat profil"), "valueChange", true);

    await waitFor(() => expect(getDb().me.isPrivate).toBe(true));
  });

  it("making a private profile public asks for confirmation first (5.6)", async () => {
    getDb().me.isPrivate = true;
    await renderWithProviders(<SettingsScreen />);
    await fireEvent(await screen.findByLabelText("Privat profil"), "valueChange", false);

    expect(await screen.findByText("Gjøre profilen offentlig?")).toBeTruthy();
    expect(screen.getByText(/synlige for alle, også på gymsiden/)).toBeTruthy();
    expect(getDb().me.isPrivate).toBe(true);

    await fireEvent.press(screen.getByRole("button", { name: "Gjør offentlig" }));
    await waitFor(() => expect(getDb().me.isPrivate).toBe(false));
  });

  it("cancelling the confirmation keeps the profile private", async () => {
    getDb().me.isPrivate = true;
    await renderWithProviders(<SettingsScreen />);
    await fireEvent(await screen.findByLabelText("Privat profil"), "valueChange", false);
    await fireEvent.press(await screen.findByRole("button", { name: "Avbryt" }));

    await waitFor(() => expect(screen.queryByText("Gjøre profilen offentlig?")).toBeNull());
    expect(getDb().me.isPrivate).toBe(true);
  });

  it("toggles 'Del loggene mine' (LOG-6)", async () => {
    await renderWithProviders(<SettingsScreen />);
    await fireEvent(await screen.findByLabelText("Del loggene mine"), "valueChange", false);

    await waitFor(() => expect(getDb().me.shareAscents).toBe(false));
  });

  it("offers the three 'Skjul beta' modes with 'Prosjektene mine' as the default (SPOIL-1)", async () => {
    await renderWithProviders(<SettingsScreen />);

    const projects = await screen.findByRole("radio", { name: /Prosjektene mine/ });
    expect(projects).toBeSelected();
    expect(screen.getByRole("radio", { name: "Av" })).not.toBeSelected();
    expect(
      screen.getByRole("radio", { name: "Alle buldre jeg ikke har toppet" }),
    ).not.toBeSelected();

    await fireEvent.press(screen.getByRole("radio", { name: "Alle buldre jeg ikke har toppet" }));
    await waitFor(() => expect(getDb().me.spoilerMode).toBe("all_unsent"));
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Alle buldre jeg ikke har toppet" })).toBeSelected(),
    );

    await fireEvent.press(screen.getByRole("radio", { name: "Av" }));
    await waitFor(() => expect(getDb().me.spoilerMode).toBe("off"));
  });

  it("shows an error when a setting cannot be saved", async () => {
    await renderWithProviders(<SettingsScreen />);
    const toggle = await screen.findByLabelText("Del loggene mine");
    mockControl.failNext = 1;
    await fireEvent(toggle, "valueChange", false);

    expect(await screen.findByText("Kunne ikke lagre innstillingen. Prøv igjen.")).toBeTruthy();
    expect(getDb().me.shareAscents).toBe(true);
  });

  it("lists the example profiles in mock mode and opens one", async () => {
    const push = jest.spyOn(router, "push").mockImplementation(() => {});
    await renderWithProviders(<SettingsScreen />);

    expect(await screen.findByText("Eksempelprofiler (testversjon)")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /Kari Hansen/ }));
    expect(push).toHaveBeenCalledWith("/user/kari");
    push.mockRestore();
  });

  it("signs out", async () => {
    await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Logg ut" }));

    expect(useSession.getState().signedIn).toBe(false);
  });
});
