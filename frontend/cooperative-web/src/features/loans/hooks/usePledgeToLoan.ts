import { useMutation, useQueryClient } from "@tanstack/react-query";
import { pledgeToLoan } from "../api/loans.api";
import { loanQueryKeys } from "./loan-query-keys";

export function usePledgeToLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, pledgedAmount }: { loanId: string; pledgedAmount: string }) =>
      pledgeToLoan(loanId, { pledgedAmount }),

    onSuccess: async (loan) => {
      await queryClient.invalidateQueries({ queryKey: loanQueryKeys.detail(loan.id) });
      await queryClient.invalidateQueries({ queryKey: loanQueryKeys.byScheme(loan.schemeId) });
    },
  });
}
