import { mockRequest, notFound } from "@/lib/mock/control";
import { getDb, toSummary } from "@/lib/mock/db";

import type { SocialApi } from "./api";

export function createMockSocialApi(): SocialApi {
  const userById = (id: string) => {
    const found = getDb().users.find((u) => u.id === id);
    if (!found) throw notFound();
    return found;
  };

  return {
    follow: (userId) =>
      mockRequest(() => {
        const db = getDb();
        const target = userById(userId);
        if (db.blocked.has(userId)) throw notFound();
        if (target.isPrivate) db.requested.add(userId);
        else db.following.add(userId);
      }),

    unfollow: (userId) =>
      mockRequest(() => {
        const db = getDb();
        db.following.delete(userId);
        db.requested.delete(userId);
      }),

    listFollowRequests: () =>
      mockRequest(() => {
        const db = getDb();
        // Requests only exist for a private profile (PROF-3).
        if (!db.me.isPrivate) return [];
        return [...db.incomingRequests].map((id) => toSummary(userById(id)));
      }),

    acceptFollowRequest: (userId) =>
      mockRequest(() => {
        const db = getDb();
        if (db.incomingRequests.delete(userId)) db.followers.add(userId);
      }),

    declineFollowRequest: (userId) =>
      mockRequest(() => {
        getDb().incomingRequests.delete(userId);
      }),

    listBlocks: () => mockRequest(() => [...getDb().blocked].map((id) => toSummary(userById(id)))),

    block: (userId) =>
      mockRequest(() => {
        const db = getDb();
        userById(userId);
        // SAFE-1: follows are removed in both directions.
        db.following.delete(userId);
        db.requested.delete(userId);
        db.incomingRequests.delete(userId);
        db.followers.delete(userId);
        db.blocked.add(userId);
      }),

    unblock: (userId) =>
      mockRequest(() => {
        getDb().blocked.delete(userId);
      }),
  };
}
