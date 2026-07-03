import { useQuery } from "@tanstack/react-query";
import { getTrialBalance } from "../api/accounting-reports.api";

export function useTrialBalance(params: {
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["reports", "trial-balance", params],
    queryFn: () => getTrialBalance(params),
  });
}