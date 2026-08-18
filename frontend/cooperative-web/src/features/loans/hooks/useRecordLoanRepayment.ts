import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordLoanRepayment } from "../api/loans.api";
import { loanQueryKeys } from "./loan-query-keys";

export function useRecordLoanRepayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, amount }: { loanId: string; amount: string }) =>
      recordLoanRepayment(loanId, { amount }),

    onSuccess: async (loan) => {
      await queryClient.invalidateQueries({ queryKey: loanQueryKeys.detail(loan.id) });
      await queryClient.invalidateQueries({ queryKey: loanQueryKeys.byScheme(loan.schemeId) });
    },
  });
}
