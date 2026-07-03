import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAccountingSettings } from "../api/accounting.api";

export function useUpdateAccountingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAccountingSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting-settings"] });
    },
  });
}