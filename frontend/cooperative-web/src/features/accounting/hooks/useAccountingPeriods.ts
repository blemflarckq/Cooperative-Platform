import { useQuery } from "@tanstack/react-query";
import { getAccountingPeriods } from "../api/accounting-periods.api";

export function useAccountingPeriods(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["accounting-periods", "list", params],
    queryFn: () => getAccountingPeriods(params),
  });
}