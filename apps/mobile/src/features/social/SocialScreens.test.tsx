import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { mockControl } from "@/lib/mock/control";
import { getDb } from "@/lib/mock/db";
import { renderWithProviders, signInOnboarded } from "@/test/helpers";

import { BlockedUsersScreen } from "./screens/BlockedUsersScreen";
import { FollowRequestsScreen } from "./screens/FollowRequestsScreen";

beforeEach(() => signInOnboarded());

describe("follow requests (PROF-3)", () => {
  // Requests only exist for a private profile.
  beforeEach(() => {
    getDb().me.isPrivate = true;
  });

  it("is empty for a public profile", async () => {
    getDb().me.isPrivate = false;
    await renderWithProviders(<FollowRequestsScreen />);

    expect(await screen.findByText("Ingen forespørsler")).toBeTruthy();
  });

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

describe("failed actions", () => {
  it("shows a message when accepting a request fails", async () => {
    getDb().me.isPrivate = true;
    await renderWithProviders(<FollowRequestsScreen />);
    const accept = await screen.findByRole("button", { name: "Godkjenn Lars Dahl" });
    mockControl.failNext = 1;
    await fireEvent.press(accept);

    expect(await screen.findByText("Kunne ikke fullføre handlingen. Prøv igjen.")).toBeTruthy();
    expect(screen.getByText("Lars Dahl")).toBeTruthy();
  });

  it("shows a message when unblocking fails", async () => {
    await renderWithProviders(<BlockedUsersScreen />);
    const unblock = await screen.findByRole("button", { name: "Opphev blokkering av Trollet" });
    mockControl.failNext = 1;
    await fireEvent.press(unblock);

    expect(await screen.findByText("Kunne ikke fullføre handlingen. Prøv igjen.")).toBeTruthy();
    expect(getDb().blocked.has("user-troll")).toBe(true);
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

describe("follow request rows", () => {
  beforeEach(() => {
    getDb().me.isPrivate = true;
  });

  it("open the requester's profile", async () => {
    const push = jest.spyOn(router, "push").mockImplementation(() => {});
    await renderWithProviders(<FollowRequestsScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Lars Dahl. @lars" }));

    expect(push).toHaveBeenCalledWith("/user/lars");
    push.mockRestore();
  });
});
