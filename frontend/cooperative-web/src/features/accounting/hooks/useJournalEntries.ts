import { useQuery } from "@tanstack/react-query";
import { getJournalEntries } from "../api/journal-entries.api";

export function useJournalEntries(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sourceModule?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["journal-entries", "list", params],
    queryFn: () => getJournalEntries(params),
  });
}