import { apiClient } from "@/lib/api/api-client";
import { buildQueryParams } from "@/lib/api/query-params";
import type {
  AccountLedger,
  AccountingSummary,
  TrialBalance,
} from "../types/accounting-report.types";

interface DateRangeParams {
  dateFrom?: string;
  dateTo?: string;
}

export async function getAccountingSummary(
  params: DateRangeParams = {},
): Promise<AccountingSummary> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<AccountingSummary>(
    `/reports/accounting-summary${query}`,
  );

  return response.data;
}

export async function getTrialBalance(
  params: DateRangeParams = {},
): Promise<TrialBalance> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<TrialBalance>(
    `/reports/trial-balance${query}`,
  );

  return response.data;
}

export async function getAccountLedger(
  accountId: string,
  params: DateRangeParams = {},
): Promise<AccountLedger> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<AccountLedger>(
    `/reports/accounts/${accountId}/ledger${query}`,
  );

  return response.data;
}