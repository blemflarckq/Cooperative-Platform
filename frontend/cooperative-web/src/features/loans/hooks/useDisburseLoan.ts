import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disburseLoan } from "../api/loans.api";
import { loanQueryKeys } from "./loan-query-keys";

export function useDisburseLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loanId: string) => disburseLoan(loanId),

    onSuccess: async (loan) => {
      await queryClient.invalidateQueries({ queryKey: loanQueryKeys.detail(loan.id) });
      await queryClient.invalidateQueries({ queryKey: loanQueryKeys.byScheme(loan.schemeId) });
    },
  });
}
