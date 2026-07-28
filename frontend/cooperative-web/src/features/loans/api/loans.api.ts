import { apiClient } from "@/lib/api/api-client";
import type {
  Loan,
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

export async function getLoansForCycle(cycleId: string): Promise<Loan[]> {
  const response = await apiClient.get<Loan[]>(`/cycles/${cycleId}/loans`);
  return response.data;
}

export async function getLoan(loanId: string): Promise<Loan> {
  const response = await apiClient.get<Loan>(`/loans/${loanId}`);
  return response.data;
}

export async function requestLoan(
  cycleId: string,
  payload: RequestLoanRequest,
): Promise<Loan> {
  const response = await apiClient.post<Loan>(`/cycles/${cycleId}/loans`, payload);
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
