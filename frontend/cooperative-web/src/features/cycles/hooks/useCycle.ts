import { useQuery } from "@tanstack/react-query";
import { getCycleById } from "../api/cycles.api";
import { cycleQueryKeys } from "./cycle-query-keys";

export function useCycle(cycleId: string) {
  return useQuery({
    queryKey: cycleQueryKeys.detail(cycleId),
    queryFn: () => getCycleById(cycleId),
    enabled: Boolean(cycleId),
  });
}