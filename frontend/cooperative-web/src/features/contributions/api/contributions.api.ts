import { apiClient } from "@/lib/api/api-client";
import { buildQueryParams } from "@/lib/api/query-params";
import type {
  ListQueryParams,
  PaginatedResponse,
} from "@/lib/api/pagination.types";
import type {
  Contribution,
  CreateContributionRequest,
  ReverseContributionRequest,
} from "../types/contribution.types";

export async function createContribution(
  cycleId: string,
  payload: CreateContributionRequest,
): Promise<Contribution> {
  const response = await apiClient.post<Contribution>(
    `/cycles/${cycleId}/contributions`,
    payload,
  );

  return response.data;
}

export async function getCycleContributions(
  cycleId: string,
  params: ListQueryParams & {
    source?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<PaginatedResponse<Contribution>> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<PaginatedResponse<Contribution>>(
    `/cycles/${cycleId}/contributions${query}`,
  );

  return response.data;
}

export async function getMemberContributions(
  tenantUserId: string,
  params: ListQueryParams = {},
): Promise<PaginatedResponse<Contribution>> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<PaginatedResponse<Contribution>>(
    `/tenant-users/${tenantUserId}/contributions${query}`,
  );

  return response.data;
}

export async function reverseContribution(
  contributionId: string,
  payload: ReverseContributionRequest,
): Promise<Contribution> {
  const response = await apiClient.post<Contribution>(
    `/contributions/${contributionId}/reverse`,
    payload,
  );

  return response.data;
}