import type { Me, PersonSummary, UserProfile } from "@/features/profile/types";

// In-memory backend for the identity mocks. Shared by the profile and social mock APIs so a
// follow made on one screen shows on the next. Reset between tests with resetMockDb().

interface MockUser extends PersonSummary {
  bio: string;
  isPrivate: boolean;
  followerCount: number;
  followingCount: number;
}

interface MockDb {
  me: Me;
  users: MockUser[];
  following: Set<string>;
  requested: Set<string>;
  incomingRequests: Set<string>;
  blocked: Set<string>;
  /** Usernames that are taken (the ones in `users` are implicitly taken too). */
  takenUsernames: Set<string>;
}

const user = (
  username: string,
  displayName: string,
  bio: string,
  isPrivate: boolean,
  followerCount: number,
): MockUser => ({
  id: `user-${username}`,
  username,
  displayName,
  bio,
  avatarUrl: null,
  isPrivate,
  followerCount,
  followingCount: 12,
});

function createDb(): MockDb {
  return {
    me: {
      id: "user-me",
      username: "",
      displayName: "",
      bio: "",
      avatarUrl: null,
      isPrivate: false,
      shareAscents: true,
      spoilerMode: "projects",
      usernameChangedAt: null,
      onboardingComplete: false,
      guidelinesVersion: null,
    },
    users: [
      user("emma", "Emma Berg", "Buldrer mest på fredager.", false, 34),
      user("ola", "Ola Nordmann", "Prosjekterer rødt.", false, 58),
      user("kari", "Kari Hansen", "Privat profil.", true, 9),
      user("nina", "Nina Olsen", "Klatrer for moro skyld.", true, 14),
      user("jonas", "Jonas Lie", "Svart er målet.", true, 21),
      user("lars", "Lars Dahl", "", false, 3),
      user("mia", "Mia Solberg", "", false, 5),
      user("troll", "Trollet", "", false, 0),
    ],
    following: new Set(["user-ola", "user-jonas"]),
    requested: new Set(["user-nina"]),
    incomingRequests: new Set(["user-lars", "user-mia"]),
    blocked: new Set(["user-troll"]),
    takenUsernames: new Set(["sebastian", "klatrer", "fbs"]),
  };
}

let db = createDb();

export const getDb = () => db;
export const resetMockDb = () => {
  db = createDb();
};

export function toSummary(u: MockUser): PersonSummary {
  return { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl };
}

export function profileFor(u: MockUser): UserProfile {
  const followState = db.following.has(u.id)
    ? "following"
    : db.requested.has(u.id)
      ? "pending"
      : "none";
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    isPrivate: u.isPrivate,
    isOwn: false,
    followerCount: u.followerCount,
    followingCount: u.followingCount,
    followState,
    canViewContent: !u.isPrivate || followState === "following",
  };
}

export function ownProfile(): UserProfile {
  const me = db.me;
  return {
    id: me.id,
    username: me.username,
    displayName: me.displayName,
    bio: me.bio,
    avatarUrl: me.avatarUrl,
    isPrivate: me.isPrivate,
    isOwn: true,
    followerCount: 0,
    followingCount: db.following.size,
    followState: "none",
    canViewContent: true,
  };
}
