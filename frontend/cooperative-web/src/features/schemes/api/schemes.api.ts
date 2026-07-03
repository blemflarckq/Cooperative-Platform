import { apiClient } from "@/lib/api/api-client";
import { buildQueryParams } from "@/lib/api/query-params";
import type {
  ListQueryParams,
  PaginatedResponse,
} from "@/lib/api/pagination.types";
import type {
  CreateSchemeRequest,
  Scheme,
  UpdateSchemeRequest,
} from "@/features/schemes/types/scheme.types";

export async function getSchemes(
  params: ListQueryParams = {},
): Promise<PaginatedResponse<Scheme>> {
  const query = buildQueryParams(params as unknown as Record<string, unknown>);
  const response = await apiClient.get<PaginatedResponse<Scheme>>(
    `/schemes${query}`,
  );
  return response.data;
}

export async function getSchemeById(id: string): Promise<Scheme> {
  const response = await apiClient.get<Scheme>(`/schemes/${id}`);
  return response.data;
}

export async function createScheme(
  payload: CreateSchemeRequest,
): Promise<Scheme> {
  const response = await apiClient.post<Scheme>("/schemes", payload);
  return response.data;
}

export async function updateScheme(
  id: string,
  payload: UpdateSchemeRequest,
): Promise<Scheme> {
  const response = await apiClient.patch<Scheme>(`/schemes/${id}`, payload);
  return response.data;
}

export async function activateScheme(id: string): Promise<Scheme> {
  const response = await apiClient.post<Scheme>(`/schemes/${id}/activate`);
  return response.data;
}

export async function suspendScheme(id: string): Promise<Scheme> {
  const response = await apiClient.post<Scheme>(`/schemes/${id}/suspend`);
  return response.data;
}

export async function archiveScheme(id: string): Promise<Scheme> {
  const response = await apiClient.post<Scheme>(`/schemes/${id}/archive`);
  return response.data;
}