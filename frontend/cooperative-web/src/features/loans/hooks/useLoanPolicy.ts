import { useQuery } from "@tanstack/react-query";
import { getLoanPolicyRequest } from "../api/loan-policy.api";

export const loanPolicyQueryKey = (schemeId: string) => ["loan-policy", schemeId] as const;

export function useLoanPolicy(schemeId: string | undefined) {
  return useQuery({
    queryKey: loanPolicyQueryKey(schemeId ?? ""),
    queryFn: () => getLoanPolicyRequest(schemeId as string),
    enabled: Boolean(schemeId),
    retry: false,
  });
}
