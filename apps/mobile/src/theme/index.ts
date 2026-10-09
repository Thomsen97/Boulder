import { useColorScheme } from "react-native";

import { darkColors, lightColors, type ColorTokens } from "./colors";

export { radius, spacing } from "./spacing";
export { useTypography } from "./typography";
export type { ColorTokens } from "./colors";

export function useColors(): ColorTokens {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}
