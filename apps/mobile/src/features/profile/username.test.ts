import {
  nextUsernameChangeAt,
  normalizeUsername,
  validateUsername,
  type UsernameError,
} from "./username";

const errorOf = (name: string): UsernameError | null => {
  const result = validateUsername(name);
  return result.valid ? null : result.error;
};

describe("validateUsername (AUTH-4)", () => {
  it.each(["abc", "emma", "a.b_c", "klatrer99", "a".repeat(20), "x_y.z"])("accepts %s", (name) => {
    expect(validateUsername(name)).toEqual({ valid: true });
  });

  it("rejects fewer than 3 characters", () => {
    expect(errorOf("")).toBe("tooShort");
    expect(errorOf("ab")).toBe("tooShort");
  });

  it("rejects more than 20 characters", () => {
    expect(errorOf("a".repeat(21))).toBe("tooLong");
  });

  it.each(["emma!", "e mma", "emmaæ", "emma-b", "emma@x"])(
    "rejects invalid characters in %s",
    (name) => {
      expect(errorOf(name)).toBe("invalidChars");
    },
  );

  it.each(["1emma", "_emma", ".emma", "9lives"])(
    "rejects %s because it does not start with a letter",
    (name) => {
      expect(errorOf(name)).toBe("mustStartWithLetter");
    },
  );

  it.each(["admin", "support", "boulder", "ADMIN", "Support"])(
    "rejects reserved word %s",
    (name) => {
      expect(errorOf(name)).toBe("reserved");
    },
  );

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(validateUsername("  Emma  ")).toEqual({ valid: true });
    expect(normalizeUsername("  Emma.B ")).toBe("emma.b");
  });
});

describe("nextUsernameChangeAt (once per 30 days)", () => {
  const now = new Date("2026-10-31T12:00:00Z");

  it("allows a first change", () => {
    expect(nextUsernameChangeAt(null, now)).toBeNull();
  });

  it("blocks a change 29 days after the last one and reports when it opens", () => {
    const next = nextUsernameChangeAt("2026-10-02T12:00:00Z", now);
    expect(next?.toISOString()).toBe("2026-11-01T12:00:00.000Z");
  });

  it("allows a change exactly 30 days after the last one", () => {
    expect(nextUsernameChangeAt("2026-10-01T12:00:00Z", now)).toBeNull();
  });

  it("allows a change after more than 30 days", () => {
    expect(nextUsernameChangeAt("2026-08-01T00:00:00Z", now)).toBeNull();
  });
});
