import { useMutation, useQueryClient } from "@tanstack/react-query";
import { requestLoan } from "../api/loans.api";
import type { RequestLoanRequest } from "../types/loan.types";
import { loanQueryKeys } from "./loan-query-keys";

export function useRequestLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schemeId, payload }: { schemeId: string; payload: RequestLoanRequest }) =>
      requestLoan(schemeId, payload),

    onSuccess: async (_loan, variables) => {
      await queryClient.invalidateQueries({
        queryKey: loanQueryKeys.byScheme(variables.schemeId),
      });
    },
  });
}
