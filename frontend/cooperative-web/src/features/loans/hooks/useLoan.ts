import { useQuery } from "@tanstack/react-query";
import { getLoan } from "../api/loans.api";
import { loanQueryKeys } from "./loan-query-keys";

export function useLoan(loanId: string) {
  return useQuery({
    queryKey: loanQueryKeys.detail(loanId),
    queryFn: () => getLoan(loanId),
    enabled: Boolean(loanId),
  });
}
