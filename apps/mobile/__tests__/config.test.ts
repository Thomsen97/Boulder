import config from "../app.config";

describe("app.config", () => {
  it("uses the agreed identifiers and deep link scheme", () => {
    const resolved = config as {
      scheme?: string;
      ios?: { bundleIdentifier?: string };
      android?: { package?: string };
    };
    expect(resolved.ios?.bundleIdentifier).toBe("no.swthomsen.boulder");
    expect(resolved.android?.package).toBe("no.swthomsen.boulder");
    expect(resolved.scheme).toBe("boulder");
  });
});
