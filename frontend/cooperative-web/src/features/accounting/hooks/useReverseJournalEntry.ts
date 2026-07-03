import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reverseJournalEntry } from "../api/journal-entries.api";

export function useReverseJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      reverseJournalEntry(id, { reason }),

    onSuccess: async (_entry, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      await queryClient.invalidateQueries({
        queryKey: ["journal-entries", "detail", variables.id],
      });
    },
  });
}