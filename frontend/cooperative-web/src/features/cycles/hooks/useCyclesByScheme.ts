import { useQuery } from "@tanstack/react-query";
import { getCyclesByScheme } from "../api/cycles.api";
import { cycleQueryKeys } from "./cycle-query-keys";
import type { ListQueryParams } from "@/lib/api/pagination.types";

export function useCyclesByScheme(
  schemeId: string,
  params: ListQueryParams = {},
) {
  return useQuery({
    queryKey: [...cycleQueryKeys.byScheme(schemeId), params],
    queryFn: () => getCyclesByScheme(schemeId, params),
    enabled: Boolean(schemeId),
  });
}