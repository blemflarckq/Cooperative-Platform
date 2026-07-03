import { useQuery } from "@tanstack/react-query";
import { getCycleContributions } from "../api/contributions.api";
import { contributionQueryKeys } from "./contribution-query-keys";

export function useCycleContributions(
  cycleId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
  },
) {
  return useQuery({
    queryKey: contributionQueryKeys.byCycle(cycleId, params),
    queryFn: () => getCycleContributions(cycleId, params),
    enabled: Boolean(cycleId),
  });
}