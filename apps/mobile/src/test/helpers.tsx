import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useSession } from "@/features/session/store";
import { getDb } from "@/lib/mock/db";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

export const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function TestProviders({
  children,
  client = createTestQueryClient(),
}: {
  children: ReactNode;
  client?: QueryClient;
}) {
  return (
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

export async function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}

/** Signs the mock session in with a finished profile, as after onboarding. */
export function signInOnboarded(overrides: Partial<ReturnType<typeof getDb>["me"]> = {}) {
  const db = getDb();
  db.me = {
    ...db.me,
    username: "tester",
    displayName: "Test Testesen",
    bio: "Liker overheng.",
    onboardingComplete: true,
    guidelinesVersion: "test",
    ...overrides,
  };
  useSession.getState().signIn();
}

/** A private profile with two pending follow requests (PROF-3). */
export function makeProfilePrivateWithRequests() {
  const db = getDb();
  db.me.isPrivate = true;
  db.incomingRequests.add("user-lars").add("user-mia");
}
