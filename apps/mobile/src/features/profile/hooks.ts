import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createMockProfileApi } from "./mock";
import { validateUsername } from "./username";
import type { ProfileApi } from "./api";
import type { MeUpdate, OnboardingInput } from "./types";

// Only the mock exists until phase 3, so the mode switch is not needed yet (see api.ts).
const api: ProfileApi = createMockProfileApi();

export const profileKeys = {
  me: ["profile", "me"] as const,
  user: (username: string) => ["profile", "user", username] as const,
  users: ["profile", "user"] as const,
  username: (name: string) => ["profile", "username", name] as const,
};

export function useMe(options: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: profileKeys.me, queryFn: () => api.getMe(), ...options });
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: profileKeys.user(username),
    queryFn: () => api.getProfile(username),
    // A 404 is an answer, not a transient failure.
    retry: false,
  });
}

export function useUpdateMe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (update: MeUpdate) => api.updateMe(update),
    onSuccess: (me) => {
      client.setQueryData(profileKeys.me, me);
      void client.invalidateQueries({ queryKey: profileKeys.users });
    },
  });
}

export function useCompleteOnboarding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: OnboardingInput) => api.completeOnboarding(input),
    onSuccess: (me) => client.setQueryData(profileKeys.me, me),
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: (username: string) => api.deleteAccount(username) });
}

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export type AvailabilityState = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

/** Live availability check (AUTH-3): only asks the server once the name is valid and stable. */
export function useUsernameAvailability(raw: string, currentUsername = ""): AvailabilityState {
  const debounced = useDebouncedValue(raw, 400);
  const validation = validateUsername(raw);
  const settled = debounced === raw;
  const unchanged = raw.trim().toLowerCase() === currentUsername;
  const enabled = validation.valid && settled && !unchanged;

  const query = useQuery({
    queryKey: profileKeys.username(debounced.trim().toLowerCase()),
    queryFn: () => api.checkUsername(debounced),
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (raw.trim() === "") return "idle";
  if (!validation.valid) return "invalid";
  if (unchanged) return "available";
  if (!settled || query.isFetching || query.isPending) return "checking";
  if (query.isError) return "error";
  return query.data?.available ? "available" : "taken";
}

/** The signed-in user's own profile as other screens render it (stats, counts, post list). */
export function useOwnProfile() {
  return useQuery({
    queryKey: profileKeys.user("@me"),
    queryFn: async () => api.getProfile((await api.getMe()).username),
    retry: false,
  });
}
