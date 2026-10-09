import { useWindowDimensions } from "react-native";

const base = {
  title: { fontSize: 24, fontWeight: "700", lineHeightRatio: 1.25 },
  body: { fontSize: 16, fontWeight: "400", lineHeightRatio: 1.4 },
  caption: { fontSize: 13, fontWeight: "400", lineHeightRatio: 1.4 },
} as const;

type Variant = keyof typeof base;
export type TextStyleToken = { fontSize: number; fontWeight: "400" | "700"; lineHeight: number };

/**
 * Text styles scaled for the user's font size setting (dynamic type). The OS scales the glyphs but
 * not an explicit lineHeight, and leaving lineHeight unset overlaps lines at the largest iOS sizes,
 * so the line height is computed from the current font scale.
 */
export function useTypography(): Record<Variant, TextStyleToken> {
  const { fontScale } = useWindowDimensions();
  const make = (v: Variant): TextStyleToken => ({
    fontSize: base[v].fontSize,
    fontWeight: base[v].fontWeight,
    lineHeight: Math.ceil(base[v].fontSize * fontScale * base[v].lineHeightRatio),
  });
  return { title: make("title"), body: make("body"), caption: make("caption") };
}
