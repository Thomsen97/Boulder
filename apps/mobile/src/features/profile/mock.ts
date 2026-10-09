import { ApiError } from "@/lib/api/errors";
import { mockRequest, notFound } from "@/lib/mock/control";
import { getDb, ownProfile, profileFor, resetMockDb } from "@/lib/mock/db";

import type { ProfileApi } from "./api";
import { BIO_MAX, DISPLAY_NAME_MAX } from "./schemas";
import { nextUsernameChangeAt, normalizeUsername, validateUsername } from "./username";

export function createMockProfileApi(now: () => Date = () => new Date()): ProfileApi {
  return {
    getMe: () => mockRequest(() => ({ ...getDb().me })),

    updateMe: (update) =>
      mockRequest(() => {
        const db = getDb();
        const next = { ...update };
        if (next.displayName !== undefined) {
          next.displayName = next.displayName.trim();
          if (next.displayName.length < 1 || next.displayName.length > DISPLAY_NAME_MAX) {
            throw new ApiError(400, "validation_failed");
          }
        }
        if (next.bio !== undefined && next.bio.length > BIO_MAX) {
          throw new ApiError(400, "validation_failed");
        }
        if (next.username !== undefined) {
          next.username = normalizeUsername(next.username);
          if (next.username !== db.me.username) {
            if (!validateUsername(next.username).valid)
              throw new ApiError(400, "validation_failed");
            if (isTaken(next.username)) throw new ApiError(409, "username_taken");
            // AUTH-4: at most one change per 30 days.
            if (nextUsernameChangeAt(db.me.usernameChangedAt, now())) {
              throw new ApiError(409, "username_change_too_soon");
            }
            db.me.usernameChangedAt = now().toISOString();
          }
        }
        // Once the profile is private, people start asking to follow (mock data for the screens).
        if (next.isPrivate === true && !db.me.isPrivate && db.incomingRequests.size === 0) {
          db.incomingRequests.add("user-lars").add("user-mia");
        }
        // 5.6: going public accepts every pending follow request.
        if (next.isPrivate === false && db.me.isPrivate) {
          db.incomingRequests.forEach((id) => db.followers.add(id));
          db.incomingRequests.clear();
        }
        db.me = { ...db.me, ...next };
        return { ...db.me };
      }),

    completeOnboarding: (input) =>
      mockRequest(() => {
        const db = getDb();
        const username = normalizeUsername(input.username);
        if (!validateUsername(username).valid) throw new ApiError(400, "validation_failed");
        if (!input.ageConfirmed) throw new ApiError(400, "validation_failed");
        if (isTaken(username)) throw new ApiError(409, "username_taken");
        db.me = {
          ...db.me,
          username,
          displayName: input.displayName.trim(),
          onboardingComplete: true,
          guidelinesVersion: input.guidelinesVersion,
        };
        return { ...db.me };
      }),

    checkUsername: (username) =>
      mockRequest(() => {
        const name = normalizeUsername(username);
        if (name === getDb().me.username) return { available: true as const };
        return isTaken(name)
          ? { available: false as const, reason: "taken" as const }
          : { available: true as const };
      }),

    getProfile: (username) =>
      mockRequest(() => {
        const db = getDb();
        const name = normalizeUsername(username);
        if (name === db.me.username && db.me.onboardingComplete) return ownProfile();
        const found = db.users.find((u) => u.username === name);
        // SAFE-1 and 5.6: a blocked pair looks exactly like a user that does not exist.
        if (!found || db.blocked.has(found.id)) throw notFound();
        return profileFor(found);
      }),

    deleteAccount: (usernameConfirmation) =>
      mockRequest(() => {
        const db = getDb();
        if (normalizeUsername(usernameConfirmation) !== db.me.username) {
          throw new ApiError(400, "validation_failed");
        }
        // A deleted user who signs up again gets a new, empty account (SPEC 6.1).
        resetMockDb();
      }),
  };
}

function isTaken(username: string): boolean {
  const db = getDb();
  return db.takenUsernames.has(username) || db.users.some((u) => u.username === username);
}
