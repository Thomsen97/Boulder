export type ColorTokens = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  success: string;
  danger: string;
};

export const lightColors: ColorTokens = {
  background: "#FFFFFF",
  surface: "#F4F4F5",
  text: "#18181B",
  textMuted: "#52525B",
  border: "#D4D4D8",
  primary: "#0F766E",
  onPrimary: "#FFFFFF",
  success: "#15803D",
  danger: "#B91C1C",
};

export const darkColors: ColorTokens = {
  background: "#0B0B0D",
  surface: "#1C1C1F",
  text: "#FAFAFA",
  textMuted: "#A1A1AA",
  border: "#3F3F46",
  primary: "#2DD4BF",
  onPrimary: "#042F2E",
  success: "#4ADE80",
  danger: "#F87171",
};
