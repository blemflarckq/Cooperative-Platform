import { apiClient } from "@/lib/api/api-client";
import { buildQueryParams } from "@/lib/api/query-params";
import type {
  CycleSavingsSummary,
  MemberSavingsStatement,
} from "../types/savings-report.types";

interface DateRangeParams extends Record<string, unknown> {
  dateFrom?: string;
  dateTo?: string;
}

export async function getMemberSavingsStatement(
  tenantUserId: string,
  params: DateRangeParams = {},
): Promise<MemberSavingsStatement> {
  const query = buildQueryParams(params);

  const response = await apiClient.get<MemberSavingsStatement>(
    `/tenant-users/${tenantUserId}/savings-statement${query}`,
  );

  return response.data;
}

export async function getCycleSavingsSummary(
  cycleId: string,
  params: DateRangeParams = {},
): Promise<CycleSavingsSummary> {
  const query = buildQueryParams(params);

  const response = await apiClient.get<CycleSavingsSummary>(
    `/cycles/${cycleId}/savings-summary${query}`,
  );

  return response.data;
}