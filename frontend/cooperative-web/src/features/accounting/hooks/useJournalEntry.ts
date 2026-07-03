import { useQuery } from "@tanstack/react-query";
import { getJournalEntryById } from "../api/journal-entries.api";

export function useJournalEntry(journalEntryId: string) {
  return useQuery({
    queryKey: ["journal-entries", "detail", journalEntryId],
    queryFn: () => getJournalEntryById(journalEntryId),
    enabled: Boolean(journalEntryId),
  });
}