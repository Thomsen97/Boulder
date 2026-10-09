// No fixed lineHeight: with dynamic type the OS scales fontSize, and a fixed lineHeight would
// clip the text at large sizes. Leaving it unset lets React Native derive it from the scaled font.
export const typography = {
  title: { fontSize: 24, fontWeight: "700" },
  body: { fontSize: 16, fontWeight: "400" },
  caption: { fontSize: 13, fontWeight: "400" },
} as const;
