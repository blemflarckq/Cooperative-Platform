import { apiClient } from "@/lib/api/api-client";
import { buildQueryParams } from "@/lib/api/query-params";
import type {
  ListQueryParams,
  PaginatedResponse,
} from "@/lib/api/pagination.types";
import type {
  CreateCycleRequest,
  OperatingCycle,
  UpdateCycleRequest,
} from "@/features/cycles/types/cycle.types";

export async function getCyclesByScheme(
  schemeId: string,
  params: ListQueryParams = {},
): Promise<PaginatedResponse<OperatingCycle>> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<PaginatedResponse<OperatingCycle>>(
    `/schemes/${schemeId}/cycles${query}`,
  );

  return response.data;
}

export async function getCycleById(
  cycleId: string,
): Promise<OperatingCycle> {
  const response = await apiClient.get<OperatingCycle>(
    `/cycles/${cycleId}`,
  );

  return response.data;
}

export async function createCycle(
  schemeId: string,
  payload: CreateCycleRequest,
): Promise<OperatingCycle> {
  const response = await apiClient.post<OperatingCycle>(
    `/schemes/${schemeId}/cycles`,
    payload,
  );

  return response.data;
}

export async function updateCycle(
  cycleId: string,
  payload: UpdateCycleRequest,
): Promise<OperatingCycle> {
  const response = await apiClient.patch<OperatingCycle>(
    `/cycles/${cycleId}`,
    payload,
  );

  return response.data;
}

export async function openCycle(cycleId: string) {
  const response = await apiClient.post<OperatingCycle>(
    `/cycles/${cycleId}/open`,
  );

  return response.data;
}

export async function pauseCycle(cycleId: string) {
  const response = await apiClient.post<OperatingCycle>(
    `/cycles/${cycleId}/pause`,
  );

  return response.data;
}

export async function closeCycle(cycleId: string) {
  const response = await apiClient.post<OperatingCycle>(
    `/cycles/${cycleId}/close`,
  );

  return response.data;
}

export async function cancelCycle(cycleId: string) {
  const response = await apiClient.post<OperatingCycle>(
    `/cycles/${cycleId}/cancel`,
  );

  return response.data;
}