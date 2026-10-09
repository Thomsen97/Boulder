import { useQuery } from "@tanstack/react-query";

import { getApiMode, type ApiMode } from "@/lib/api/mode";

import { createLiveHealthApi, type HealthApi } from "./api";
import { createMockHealthApi } from "./mock";

export function selectHealthApi(mode: ApiMode): HealthApi {
  return mode === "live" ? createLiveHealthApi() : createMockHealthApi();
}

export function useHealth() {
  return useQuery({
    queryKey: ["health", "status"],
    queryFn: () => selectHealthApi(getApiMode("health")).getHealth(),
  });
}
