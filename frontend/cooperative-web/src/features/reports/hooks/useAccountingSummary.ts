import { useQuery } from "@tanstack/react-query";
import { getAccountingSummary } from "../api/accounting-reports.api";

export function useAccountingSummary(params: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["reports", "accounting-summary", params],
    queryFn: () => getAccountingSummary(params),
  });
}