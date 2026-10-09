import type { PersonSummary } from "@/features/profile/types";

// Phase 2 only has a mock implementation (mock.ts); the live one arrives in phase 5.
export interface SocialApi {
  /** Follows a public profile at once, or sends a request to a private one (PROF-3). */
  follow(userId: string): Promise<void>;
  /** Unfollows, or cancels a pending request. */
  unfollow(userId: string): Promise<void>;
  listFollowRequests(): Promise<PersonSummary[]>;
  acceptFollowRequest(userId: string): Promise<void>;
  declineFollowRequest(userId: string): Promise<void>;
  listBlocks(): Promise<PersonSummary[]>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
}
