import type { HealthApi } from "./api";

export function createMockHealthApi(): HealthApi {
  return {
    async getHealth() {
      return "Healthy";
    },
  };
}
