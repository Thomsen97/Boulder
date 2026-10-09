// View models for the identity screens. Field names follow SPEC 12.1 in camelCase so the mock
// can be replaced by the generated API types in phase 3 without touching the screens.

export type SpoilerMode = "off" | "projects" | "all_unsent";

/** The signed-in user (GET /me). */
export interface Me {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  shareAscents: boolean;
  spoilerMode: SpoilerMode;
  usernameChangedAt: string | null;
  onboardingComplete: boolean;
  guidelinesVersion: string | null;
}

export type FollowState = "none" | "pending" | "following";

/** Another user's (or the own) profile as returned to a viewer (GET /users/{username}). */
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  isOwn: boolean;
  followerCount: number;
  followingCount: number;
  followState: FollowState;
  /** PROF-5: posts, stats and lists are only available when the server says so. */
  canViewContent: boolean;
}

export interface OnboardingInput {
  username: string;
  displayName: string;
  ageConfirmed: boolean;
  guidelinesVersion: string;
}

export type MeUpdate = Partial<
  Pick<Me, "displayName" | "bio" | "username" | "isPrivate" | "shareAscents" | "spoilerMode">
>;

export type UsernameAvailability = { available: true } | { available: false; reason: "taken" };

export interface PersonSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}
