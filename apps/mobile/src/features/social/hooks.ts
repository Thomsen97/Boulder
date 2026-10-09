import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { profileKeys } from "@/features/profile/hooks";

import type { SocialApi } from "./api";
import { createMockSocialApi } from "./mock";

// Only the mock exists until phase 5, so the mode switch is not needed yet (see api.ts).
const api: SocialApi = createMockSocialApi();

export const socialKeys = {
  requests: ["social", "requests"] as const,
  blocks: ["social", "blocks"] as const,
};

export function useFollowRequests() {
  return useQuery({ queryKey: socialKeys.requests, queryFn: () => api.listFollowRequests() });
}

export function useBlocks() {
  return useQuery({ queryKey: socialKeys.blocks, queryFn: () => api.listBlocks() });
}

/** Runs a social mutation and refreshes everything it can change. */
function useSocialMutation(run: (userId: string) => Promise<void>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: profileKeys.users }),
        client.invalidateQueries({ queryKey: socialKeys.requests }),
        client.invalidateQueries({ queryKey: socialKeys.blocks }),
      ]),
  });
}

export const useFollow = () => useSocialMutation((id) => api.follow(id));
export const useUnfollow = () => useSocialMutation((id) => api.unfollow(id));
export const useAcceptFollowRequest = () => useSocialMutation((id) => api.acceptFollowRequest(id));
export const useDeclineFollowRequest = () =>
  useSocialMutation((id) => api.declineFollowRequest(id));
export const useBlock = () => useSocialMutation((id) => api.block(id));
export const useUnblock = () => useSocialMutation((id) => api.unblock(id));
