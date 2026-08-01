import { useQuery } from "@tanstack/react-query";
import { previewLoanSplit } from "../api/loans.api";
import { loanQueryKeys } from "./loan-query-keys";

/**
 * Backs the live "here's how this breaks down" preview on the request
 * form. The caller is responsible for debouncing the amount before it
 * reaches this hook — see useDebouncedValue in RequestLoanPage.
 */
export function useLoanSplitPreview(schemeId: string, amount: string) {
  const isValidAmount = Boolean(amount) && Number(amount) > 0;

  return useQuery({
    queryKey: loanQueryKeys.preview(schemeId, amount),
    queryFn: () => previewLoanSplit(schemeId, amount),
    enabled: Boolean(schemeId) && isValidAmount,
  });
}
