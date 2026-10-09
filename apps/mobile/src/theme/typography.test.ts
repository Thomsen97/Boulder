import { renderHook } from "@testing-library/react-native";
import { Dimensions } from "react-native";

import { useTypography } from "./typography";

async function typographyAt(fontScale: number) {
  Dimensions.set({ window: { width: 390, height: 844, scale: 3, fontScale } });
  const { result } = await renderHook(() => useTypography());
  return result.current;
}

describe("useTypography", () => {
  it("gives every variant a line height larger than its font size", async () => {
    const typography = await typographyAt(1);
    for (const style of Object.values(typography)) {
      expect(style.lineHeight).toBeGreaterThan(style.fontSize);
    }
  });

  it("grows the line height with the user's font scale", async () => {
    const normal = (await typographyAt(1)).body.lineHeight;
    const large = (await typographyAt(2)).body.lineHeight;
    expect(normal).toBe(23);
    expect(large).toBeGreaterThanOrEqual(normal * 2 - 1);
  });
});
