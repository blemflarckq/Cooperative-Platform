import { apiClient } from "@/lib/api/api-client";
import type { LoanPolicy, UpsertLoanPolicyRequest } from "../types/loan-policy.types";

export async function getLoanPolicyRequest(schemeId: string): Promise<LoanPolicy> {
  const response = await apiClient.get<LoanPolicy>(`/schemes/${schemeId}/loan-policy`);
  return response.data;
}

export async function upsertLoanPolicyRequest(
  schemeId: string,
  payload: UpsertLoanPolicyRequest,
): Promise<LoanPolicy> {
  const response = await apiClient.put<LoanPolicy>(`/schemes/${schemeId}/loan-policy`, payload);
  return response.data;
}
