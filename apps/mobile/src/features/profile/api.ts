import type { Me, MeUpdate, OnboardingInput, UserProfile, UsernameAvailability } from "./types";

// Phase 2 only has a mock implementation (mock.ts). The live implementation, built on the
// generated client, is added in phase 3 (API: authentication, users, onboarding).
export interface ProfileApi {
  getMe(): Promise<Me>;
  updateMe(update: MeUpdate): Promise<Me>;
  completeOnboarding(input: OnboardingInput): Promise<Me>;
  checkUsername(username: string): Promise<UsernameAvailability>;
  /** Rejects with a 404 ApiError when the user does not exist or is in a blocked pair. */
  getProfile(username: string): Promise<UserProfile>;
  deleteAccount(usernameConfirmation: string): Promise<void>;
}
