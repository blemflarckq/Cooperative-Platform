import { apiClient } from "@/lib/api/api-client";
import type {
  BulkCreateCycleParticipantsRequest,
  BulkCreateCycleParticipantsResponse,
  CreateCycleParticipantRequest,
  CycleParticipant,
  UpdateCycleParticipantRequest,
} from "../types/cycle-participant.types";
import { buildQueryParams } from "@/lib/api/query-params";
import {
  type ListQueryParams,
  type PaginatedResponse,
} from "@/lib/api/pagination.types";

export async function getCycleParticipants(
  cycleId: string,
  params: ListQueryParams = {},
): Promise<PaginatedResponse<CycleParticipant>> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<PaginatedResponse<CycleParticipant>>(
    `/cycles/${cycleId}/participants${query}`,
  );

  return response.data;
}

export async function getCycleParticipantById(
  participantId: string,
): Promise<CycleParticipant> {
  const response = await apiClient.get<CycleParticipant>(
    `/cycle-participants/${participantId}`,
  );

  return response.data;
}

export async function createCycleParticipant(
  cycleId: string,
  payload: CreateCycleParticipantRequest,
): Promise<CycleParticipant> {
  const response = await apiClient.post<CycleParticipant>(
    `/cycles/${cycleId}/participants`,
    payload,
  );

  return response.data;
}

export async function updateCycleParticipant(
  participantId: string,
  payload: UpdateCycleParticipantRequest,
): Promise<CycleParticipant> {
  const response = await apiClient.patch<CycleParticipant>(
    `/cycle-participants/${participantId}`,
    payload,
  );

  return response.data;
}

export async function suspendCycleParticipant(
  participantId: string,
): Promise<CycleParticipant> {
  const response = await apiClient.post<CycleParticipant>(
    `/cycle-participants/${participantId}/suspend`,
  );

  return response.data;
}

export async function reactivateCycleParticipant(
  participantId: string,
): Promise<CycleParticipant> {
  const response = await apiClient.post<CycleParticipant>(
    `/cycle-participants/${participantId}/reactivate`,
  );

  return response.data;
}

export async function exitCycleParticipant(
  participantId: string,
): Promise<CycleParticipant> {
  const response = await apiClient.post<CycleParticipant>(
    `/cycle-participants/${participantId}/exit`,
  );

  return response.data;
}

export async function removeCycleParticipant(
  participantId: string,
): Promise<CycleParticipant> {
  const response = await apiClient.post<CycleParticipant>(
    `/cycle-participants/${participantId}/remove`,
  );

  return response.data;
}

export async function bulkCreateCycleParticipants(
  cycleId: string,
  payload: BulkCreateCycleParticipantsRequest,
): Promise<BulkCreateCycleParticipantsResponse> {
  const response = await apiClient.post<BulkCreateCycleParticipantsResponse>(
    `/cycles/${cycleId}/participants/bulk`,
    payload,
  );

  return response.data;
}