export type ApiMode = "mock" | "live";

/**
 * Parses EXPO_PUBLIC_API_MODE. Accepts "mock", "live" or a comma list where a bare value sets
 * the default and "feature:mode" overrides one feature, e.g. "live,groups:mock".
 * An empty or missing value means "mock".
 */
export function resolveApiMode(feature: string, raw: string | undefined): ApiMode {
  let mode: ApiMode = "mock";
  for (const part of (raw ?? "").split(",").map((p) => p.trim())) {
    if (part === "mock" || part === "live") {
      mode = part;
      continue;
    }
    const [name, value] = part.split(":").map((p) => p.trim());
    if (name === feature && (value === "mock" || value === "live")) {
      return value;
    }
  }
  return mode;
}

export function getApiMode(feature: string): ApiMode {
  return resolveApiMode(feature, process.env.EXPO_PUBLIC_API_MODE);
}
