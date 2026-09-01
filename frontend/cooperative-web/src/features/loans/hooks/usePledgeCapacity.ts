import { useQuery } from "@tanstack/react-query";
import { getPledgeCapacity } from "../api/loans.api";

export function usePledgeCapacity(loanId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["loans", "pledge-capacity", loanId],
    queryFn: () => getPledgeCapacity(loanId),
    enabled: Boolean(loanId) && enabled,
  });
}
