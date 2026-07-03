import { apiClient } from "@/lib/api/api-client";
import { buildQueryParams } from "@/lib/api/query-params";
import type {
  ListQueryParams,
  PaginatedResponse,
} from "@/lib/api/pagination.types";
import type {
  AccountingPeriod,
  CreateAccountingPeriodRequest,
} from "../types/accounting-period.types";

export async function createAccountingPeriod(
  payload: CreateAccountingPeriodRequest,
): Promise<AccountingPeriod> {
  const response = await apiClient.post<AccountingPeriod>(
    "/accounting-periods",
    payload,
  );

  return response.data;
}

export async function getAccountingPeriods(
  params: ListQueryParams = {},
): Promise<PaginatedResponse<AccountingPeriod>> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<PaginatedResponse<AccountingPeriod>>(
    `/accounting-periods${query}`,
  );

  return response.data;
}

export async function getAccountingPeriodById(
  id: string,
): Promise<AccountingPeriod> {
  const response = await apiClient.get<AccountingPeriod>(
    `/accounting-periods/${id}`,
  );

  return response.data;
}

export async function closeAccountingPeriod(
  id: string,
): Promise<AccountingPeriod> {
  const response = await apiClient.post<AccountingPeriod>(
    `/accounting-periods/${id}/close`,
  );

  return response.data;
}