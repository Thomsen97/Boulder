import { resolveApiMode } from "@/lib/api/mode";

describe("resolveApiMode", () => {
  it("defaults to mock when unset or empty", () => {
    expect(resolveApiMode("groups", undefined)).toBe("mock");
    expect(resolveApiMode("groups", "")).toBe("mock");
  });

  it("applies a bare value to every feature", () => {
    expect(resolveApiMode("groups", "live")).toBe("live");
    expect(resolveApiMode("groups", "mock")).toBe("mock");
  });

  it("lets a feature override the default regardless of order", () => {
    expect(resolveApiMode("groups", "live,groups:mock")).toBe("mock");
    expect(resolveApiMode("groups", "groups:mock,live")).toBe("mock");
    expect(resolveApiMode("gym", "live,groups:mock")).toBe("live");
    expect(resolveApiMode("gym", "groups:live")).toBe("mock");
  });

  it("ignores unknown modes", () => {
    expect(resolveApiMode("groups", "banana,groups:banana")).toBe("mock");
  });
});
