import { apiClient } from "@/lib/api/api-client";
import type {
  Loan,
  LoanSplitPreview,
  RequestLoanRequest,
  PledgeLoanRequest,
  RecordRepaymentRequest,
} from "../types/loan.types";

/**
 * NOTE: unlike most list endpoints in this app (e.g. contributions), the
 * backend loans endpoints currently return a plain array, not a
 * PaginatedResponse<T> envelope. Worth aligning for consistency once
 * there's a reason to paginate (a scheme with many loans) — not urgent
 * for pilot scale, flagging here so it isn't mistaken for an oversight
 * later.
 */

export async function getLoansForScheme(schemeId: string): Promise<Loan[]> {
  const response = await apiClient.get<Loan[]>(`/schemes/${schemeId}/loans`);
  return response.data;
}

export async function getLoan(loanId: string): Promise<Loan> {
  const response = await apiClient.get<Loan>(`/loans/${loanId}`);
  return response.data;
}

export async function previewLoanSplit(
  schemeId: string,
  amount: string,
): Promise<LoanSplitPreview> {
  const response = await apiClient.get<LoanSplitPreview>(
    `/schemes/${schemeId}/loans/preview`,
    { params: { amount } },
  );
  return response.data;
}

/**
 * Scoped to a scheme only — never a cycle. The backend resolves "the
 * current cycle" internally now (see OperatingCyclesService.
 * resolveCurrentCycle on the backend), which is the whole point: a member
 * requesting a loan should never need to know what a "cycle" is, let
 * alone select one.
 */
export async function requestLoan(
  schemeId: string,
  payload: RequestLoanRequest,
): Promise<Loan> {
  const response = await apiClient.post<Loan>(`/schemes/${schemeId}/loans`, payload);
  return response.data;
}

export async function getPledgeCapacity(loanId: string): Promise<{ availableAmount: string }> {
  const response = await apiClient.get<{ availableAmount: string }>(
    `/loans/${loanId}/pledge-capacity`,
  );
  return response.data;
}

export async function pledgeToLoan(
  loanId: string,
  payload: PledgeLoanRequest,
): Promise<Loan> {
  const response = await apiClient.post<Loan>(`/loans/${loanId}/pledges`, payload);
  return response.data;
}

export async function disburseLoan(loanId: string): Promise<Loan> {
  const response = await apiClient.post<Loan>(`/loans/${loanId}/disburse`);
  return response.data;
}

export async function recordLoanRepayment(
  loanId: string,
  payload: RecordRepaymentRequest,
): Promise<Loan> {
  const response = await apiClient.post<Loan>(`/loans/${loanId}/repayments`, payload);
  return response.data;
}
