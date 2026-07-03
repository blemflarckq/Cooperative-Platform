import { useQuery } from "@tanstack/react-query";
import { getCycleSavingsSummary } from "../api/savings-reports.api";

export function useCycleSavingsSummary(
  cycleId: string,
  params: {
    dateFrom?: string;
    dateTo?: string;
  },
) {
  return useQuery({
    queryKey: ["savings-summary", "cycle", cycleId, params],
    queryFn: () => getCycleSavingsSummary(cycleId, params),
    enabled: Boolean(cycleId),
  });
}