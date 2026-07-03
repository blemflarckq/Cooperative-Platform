import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postManualJournalEntry } from "../api/journal-entries.api";

export function usePostManualJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postManualJournalEntry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    },
  });
}