import { ApiError } from "@/lib/api/errors";

export const notFound = () => new ApiError(404, "not_found");

type Scenario = "normal" | "error";

const envDelay = () => Number(process.env.EXPO_PUBLIC_MOCK_DELAY_MS ?? 400);
const envScenario = (): Scenario =>
  process.env.EXPO_PUBLIC_MOCK_SCENARIO === "error" ? "error" : "normal";

/**
 * Knobs that make loading and error states visible while building UI against the mocks.
 * EXPO_PUBLIC_MOCK_DELAY_MS (default 400) and EXPO_PUBLIC_MOCK_SCENARIO (normal | error).
 */
export const mockControl = {
  delayMs: envDelay(),
  scenario: envScenario(),
  /** Number of upcoming calls that fail with a network-style error. Used by tests. */
  failNext: 0,
};

export function resetMockControl() {
  mockControl.delayMs = envDelay();
  mockControl.scenario = envScenario();
  mockControl.failNext = 0;
}

/** Runs a mock operation after the configured delay, failing when the scenario says so. */
export async function mockRequest<T>(operation: () => T): Promise<T> {
  if (mockControl.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, mockControl.delayMs));
  }
  if (mockControl.scenario === "error" || mockControl.failNext > 0) {
    if (mockControl.failNext > 0) mockControl.failNext -= 1;
    throw new ApiError(500, "internal_error");
  }
  return operation();
}
