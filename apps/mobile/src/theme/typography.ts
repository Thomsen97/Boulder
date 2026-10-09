// Font sizes are scaled by the OS (dynamic type) because Text allows font scaling by default.
export const typography = {
  title: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  body: { fontSize: 16, fontWeight: "400", lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
} as const;
