import { apiClient } from "@/lib/api/api-client";
import { buildQueryParams } from "@/lib/api/query-params";
import type {
  ListQueryParams,
  PaginatedResponse,
} from "@/lib/api/pagination.types";
import type {
  Account,
  AccountingSettings,
  CreateAccountRequest,
  ProvisionDefaultsRequest,
  UpdateAccountRequest,
  UpdateAccountingSettingsRequest,
} from "@/features/accounting/types/accounting.types";

export async function getAccounts(
  params: ListQueryParams & { type?: string } = {},
): Promise<PaginatedResponse<Account>> {
  const query = buildQueryParams(params as Record<string, unknown>);
  const response = await apiClient.get<PaginatedResponse<Account>>(
    `/accounts${query}`,
  );
  return response.data;
}

export async function getAccountById(id: string): Promise<Account> {
  const response = await apiClient.get<Account>(`/accounts/${id}`);
  return response.data;
}

export async function createAccount(
  payload: CreateAccountRequest,
): Promise<Account> {
  const response = await apiClient.post<Account>("/accounts", payload);
  return response.data;
}

export async function updateAccount(
  id: string,
  payload: UpdateAccountRequest,
): Promise<Account> {
  const response = await apiClient.patch<Account>(`/accounts/${id}`, payload);
  return response.data;
}

export async function deactivateAccount(id: string): Promise<Account> {
  const response = await apiClient.post<Account>(`/accounts/${id}/deactivate`);
  return response.data;
}

export async function archiveAccount(id: string): Promise<Account> {
  const response = await apiClient.post<Account>(`/accounts/${id}/archive`);
  return response.data;
}

export async function getAccountingSettings(): Promise<AccountingSettings> {
  const response = await apiClient.get<AccountingSettings>(
    "/accounting-settings",
  );
  return response.data;
}

export async function updateAccountingSettings(
  payload: UpdateAccountingSettingsRequest,
): Promise<AccountingSettings> {
  const response = await apiClient.put<AccountingSettings>(
    "/accounting-settings",
    payload,
  );
  return response.data;
}

export async function provisionDefaultAccountingSettings(
  payload: ProvisionDefaultsRequest,
): Promise<AccountingSettings> {
  const response = await apiClient.post<AccountingSettings>(
    "/accounting-settings/provision-defaults",
    payload,
  );
  return response.data;
}