/* eslint-disable @typescript-eslint/no-require-imports */

// The Supabase client and its native storage modules are only needed in live mode. Loading them
// on demand keeps mock mode (and most tests) free of them. `require` is used because Jest does
// not run dynamic `import()` without extra flags.
export const loadActions = () => require("./actions") as typeof import("./actions");
export const loadSupabase = () => require("./supabase") as typeof import("./supabase");
