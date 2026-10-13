import { getApiClient, type ApiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

import type {
  FollowState,
  Me,
  MeUpdate,
  OnboardingInput,
  SpoilerMode,
  UserProfile,
  UsernameAvailability,
  UsernameUnavailableReason,
} from "./types";

export interface ProfileApi {
  getMe(): Promise<Me>;
  updateMe(update: MeUpdate): Promise<Me>;
  completeOnboarding(input: OnboardingInput): Promise<Me>;
  checkUsername(username: string): Promise<UsernameAvailability>;
  /** Rejects with a 404 ApiError when the user does not exist or is in a blocked pair. */
  getProfile(username: string): Promise<UserProfile>;
  deleteAccount(usernameConfirmation: string): Promise<void>;
}

type MeDto = import("@/lib/api/schema").components["schemas"]["MeDto"];
type UserProfileDto = import("@/lib/api/schema").components["schemas"]["UserProfileDto"];

/** Turns an error answer into an `ApiError`; the `code` is the ProblemDetails extension (SPEC 13). */
function failure(status: number, error: unknown): ApiError {
  const code = (error as { code?: unknown } | undefined)?.code;
  return new ApiError(status, typeof code === "string" ? code : "unknown");
}

/** A user who has not finished onboarding gets `onboardingComplete: false` and null fields. */
export function toMe(dto: MeDto): Me {
  return {
    id: dto.id ?? "",
    username: dto.username ?? "",
    displayName: dto.displayName ?? "",
    bio: dto.bio ?? "",
    avatarUrl: dto.avatarUrl,
    isPrivate: dto.isPrivate ?? false,
    shareAscents: dto.shareAscents ?? true,
    spoilerMode: (dto.spoilerMode ?? "off") as SpoilerMode,
    usernameChangedAt: dto.usernameChangedAt,
    onboardingComplete: dto.onboardingComplete,
    guidelinesVersion: dto.guidelinesVersion,
  };
}

function toProfile(dto: UserProfileDto): UserProfile {
  return {
    ...dto,
    followerCount: Number(dto.followerCount),
    followingCount: Number(dto.followingCount),
    followState: dto.followState as FollowState,
  };
}

export function createLiveProfileApi(client: () => ApiClient = getApiClient): ProfileApi {
  return {
    async getMe() {
      const { data, error, response } = await client().GET("/api/v1/me");
      if (!data) throw failure(response.status, error);
      return toMe(data);
    },

    async updateMe(update: MeUpdate) {
      const { data, error, response } = await client().PATCH("/api/v1/me", {
        body: {
          displayName: update.displayName ?? null,
          bio: update.bio ?? null,
          username: update.username ?? null,
          isPrivate: update.isPrivate ?? null,
          shareAscents: update.shareAscents ?? null,
          spoilerMode: update.spoilerMode ?? null,
        },
      });
      if (!data) throw failure(response.status, error);
      return toMe(data);
    },

    async completeOnboarding(input: OnboardingInput) {
      const { data, error, response } = await client().POST("/api/v1/me/onboarding", {
        body: input,
      });
      if (!data) throw failure(response.status, error);
      return toMe(data);
    },

    async checkUsername(username: string): Promise<UsernameAvailability> {
      const { data, error, response } = await client().GET(
        "/api/v1/usernames/{name}/availability",
        {
          params: { path: { name: username } },
        },
      );
      if (!data) throw failure(response.status, error);
      return data.available
        ? { available: true }
        : { available: false, reason: (data.reason ?? "taken") as UsernameUnavailableReason };
    },

    async getProfile(username: string) {
      const { data, error, response } = await client().GET("/api/v1/users/{username}", {
        params: { path: { username } },
      });
      if (!data) throw failure(response.status, error);
      return toProfile(data);
    },

    // The API has no deletion endpoint until phase 21 (DEL-1, DEL-2).
    async deleteAccount() {
      throw new ApiError(501, "not_implemented");
    },
  };
}
