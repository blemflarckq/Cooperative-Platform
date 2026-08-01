import { useQuery } from "@tanstack/react-query";
import { getLoansForScheme } from "../api/loans.api";
import { loanQueryKeys } from "./loan-query-keys";

export function useSchemeLoans(schemeId: string) {
  return useQuery({
    queryKey: loanQueryKeys.byScheme(schemeId),
    queryFn: () => getLoansForScheme(schemeId),
    enabled: Boolean(schemeId),
  });
}
