import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { upsertLoanPolicyRequest } from "../api/loan-policy.api";
import type { UpsertLoanPolicyRequest } from "../types/loan-policy.types";
import { loanPolicyQueryKey } from "./useLoanPolicy";

export function useUpsertLoanPolicy(schemeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertLoanPolicyRequest) => upsertLoanPolicyRequest(schemeId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: loanPolicyQueryKey(schemeId) });
      toast.success("Loan terms saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
