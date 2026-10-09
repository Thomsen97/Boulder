import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import "@/i18n";
import { useMe } from "@/features/profile/hooks";
import { useSession } from "@/features/session/store";
import { QueryProvider } from "@/lib/api/QueryProvider";
import { useColors } from "@/theme";
import { ErrorState, LoadingState } from "@/theme/components";

export default function RootLayout() {
  return (
    <QueryProvider>
      <StatusBar style="auto" />
      <AuthGate />
    </QueryProvider>
  );
}

/**
 * Routes by sign-in state (AUTH-3): signed out goes to the welcome screen, a signed-in user
 * without a finished profile goes to onboarding, everyone else gets the app.
 */
function AuthGate() {
  const colors = useColors();
  const client = useQueryClient();
  const signedIn = useSession((s) => s.signedIn);
  const me = useMe({ enabled: signedIn });

  // Drop cached data of the previous user when signing out.
  useEffect(() => {
    if (!signedIn) client.clear();
  }, [signedIn, client]);

  // Only block the app while there is nothing to route by. A failed background refetch keeps the
  // cached profile, so the user does not lose their place in the navigator.
  if (signedIn && me.data === undefined) {
    return me.isError ? <ErrorState onRetry={() => void me.refetch()} /> : <LoadingState />;
  }

  const needsOnboarding = signedIn && !me.data?.onboardingComplete;
  const inApp = signedIn && !needsOnboarding;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={inApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="user/[username]" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/follow-requests" />
        <Stack.Screen name="settings/blocked" />
        <Stack.Screen name="settings/delete-account" />
      </Stack.Protected>
    </Stack>
  );
}
