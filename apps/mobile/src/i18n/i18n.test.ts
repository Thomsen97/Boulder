import i18n from "@/i18n";
import nb from "@/i18n/nb.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("i18n", () => {
  it("defaults to Norwegian bokmål", () => {
    expect(i18n.language).toBe("nb");
    expect(i18n.t("tabs.home")).toBe("Hjem");
  });

  it("resolves every key in nb.json to a non-empty string that is not the key", () => {
    for (const key of keys(nb)) {
      const value = i18n.t(key);
      expect(value).not.toBe(key);
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
