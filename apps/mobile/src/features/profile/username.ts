// AUTH-4: 3-20 characters [a-z0-9._], starts with a letter, unique case-insensitively, reserved
// words blocked, changeable at most once per 30 days.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_CHANGE_DAYS = 30;

export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin",
  "administrator",
  "boulder",
  "buldring",
  "help",
  "hjelp",
  "moderator",
  "root",
  "staff",
  "support",
  "system",
  "team",
]);

export type UsernameError =
  "tooShort" | "tooLong" | "invalidChars" | "mustStartWithLetter" | "reserved";

export type UsernameValidation = { valid: true } | { valid: false; error: UsernameError };

/** Usernames are case-insensitive, so input is trimmed and lowercased before it is checked. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): UsernameValidation {
  const name = normalizeUsername(raw);
  if (name.length < USERNAME_MIN) return { valid: false, error: "tooShort" };
  if (name.length > USERNAME_MAX) return { valid: false, error: "tooLong" };
  if (!/^[a-z0-9._]+$/.test(name)) return { valid: false, error: "invalidChars" };
  if (!/^[a-z]/.test(name)) return { valid: false, error: "mustStartWithLetter" };
  if (RESERVED_USERNAMES.has(name)) return { valid: false, error: "reserved" };
  return { valid: true };
}

/** The earliest moment the username may change again, or null when it may change now. */
export function nextUsernameChangeAt(changedAt: string | null, now: Date): Date | null {
  if (!changedAt) return null;
  const next = new Date(changedAt);
  next.setUTCDate(next.getUTCDate() + USERNAME_CHANGE_DAYS);
  return next.getTime() > now.getTime() ? next : null;
}
