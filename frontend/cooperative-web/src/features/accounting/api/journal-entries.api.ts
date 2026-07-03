import { apiClient } from "@/lib/api/api-client";
import { buildQueryParams } from "@/lib/api/query-params";
import type { ListQueryParams, PaginatedResponse } from "@/lib/api/pagination.types";
import type {
  JournalEntry,
  ManualJournalEntryRequest,
  ReverseJournalEntryRequest,
} from "../types/journal.types";

export async function getJournalEntries(
  params: ListQueryParams & {
    sourceModule?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<PaginatedResponse<JournalEntry>> {
  const query = buildQueryParams(params as Record<string, unknown>);

  const response = await apiClient.get<PaginatedResponse<JournalEntry>>(
    `/journal-entries${query}`,
  );

  return response.data;
}

export async function getJournalEntryById(id: string): Promise<JournalEntry> {
  const response = await apiClient.get<JournalEntry>(`/journal-entries/${id}`);
  return response.data;
}

export async function postManualJournalEntry(
  payload: ManualJournalEntryRequest,
): Promise<JournalEntry> {
  const response = await apiClient.post<JournalEntry>(
    "/journal-entries/manual",
    payload,
  );

  return response.data;
}

export async function reverseJournalEntry(
  id: string,
  payload: ReverseJournalEntryRequest,
): Promise<JournalEntry> {
  const response = await apiClient.post<JournalEntry>(
    `/journal-entries/${id}/reverse`,
    payload,
  );

  return response.data;
}