import { getApiClient, type ApiClient } from "@/lib/api/client";

export type HealthStatus = "Healthy" | "Degraded" | "Unhealthy";

export interface HealthApi {
  getHealth(): Promise<HealthStatus>;
}

function toStatus(text: string | undefined): HealthStatus {
  return text === "Healthy" || text === "Degraded" ? text : "Unhealthy";
}

export function createLiveHealthApi(client: () => ApiClient = getApiClient): HealthApi {
  return {
    async getHealth() {
      const { data, error } = await client().GET("/health", { parseAs: "text" });
      // 503 is a normal answer from a running API whose database check failed.
      return toStatus(data ?? (typeof error === "string" ? error : undefined));
    },
  };
}
