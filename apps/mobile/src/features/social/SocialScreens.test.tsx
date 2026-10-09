import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { mockControl } from "@/lib/mock/control";
import { getDb } from "@/lib/mock/db";
import { renderWithProviders, signInOnboarded } from "@/test/helpers";

import { BlockedUsersScreen } from "./screens/BlockedUsersScreen";
import { FollowRequestsScreen } from "./screens/FollowRequestsScreen";

beforeEach(() => signInOnboarded());

describe("follow requests (PROF-3)", () => {
  it("shows a loading state and then the requests", async () => {
    mockControl.delayMs = 50;
    await renderWithProviders(<FollowRequestsScreen />);
    expect(screen.getByRole("progressbar")).toBeTruthy();

    expect(await screen.findByText("Lars Dahl")).toBeTruthy();
    expect(screen.getByText("Mia Solberg")).toBeTruthy();
  });

  it("accepting a request removes it from the list", async () => {
    await renderWithProviders(<FollowRequestsScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Godkjenn Lars Dahl" }));

    await waitFor(() => expect(screen.queryByText("Lars Dahl")).toBeNull());
    expect(screen.getByText("Mia Solberg")).toBeTruthy();
    expect(getDb().incomingRequests.has("user-lars")).toBe(false);
  });

  it("shows the empty state once every request is handled", async () => {
    await renderWithProviders(<FollowRequestsScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Godkjenn Lars Dahl" }));
    await waitFor(() => expect(screen.queryByText("Lars Dahl")).toBeNull());
    await fireEvent.press(screen.getByRole("button", { name: "Avslå Mia Solberg" }));

    expect(await screen.findByText("Ingen forespørsler")).toBeTruthy();
  });

  it("shows an error state with retry", async () => {
    mockControl.failNext = 1;
    await renderWithProviders(<FollowRequestsScreen />);

    expect(await screen.findByText("Noe gikk galt")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(await screen.findByText("Lars Dahl")).toBeTruthy();
  });
});

describe("blocked users (SAFE-1)", () => {
  it("shows a loading state and then the blocked users", async () => {
    mockControl.delayMs = 50;
    await renderWithProviders(<BlockedUsersScreen />);
    expect(screen.getByRole("progressbar")).toBeTruthy();

    expect(await screen.findByText("Trollet")).toBeTruthy();
  });

  it("unblocking removes the user and shows the empty state", async () => {
    await renderWithProviders(<BlockedUsersScreen />);
    await fireEvent.press(
      await screen.findByRole("button", { name: "Opphev blokkering av Trollet" }),
    );

    expect(await screen.findByText("Ingen blokkerte brukere")).toBeTruthy();
    expect(getDb().blocked.size).toBe(0);
  });

  it("shows an error state with retry", async () => {
    mockControl.failNext = 1;
    await renderWithProviders(<BlockedUsersScreen />);

    expect(await screen.findByText("Noe gikk galt")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(await screen.findByText("Trollet")).toBeTruthy();
  });
});
