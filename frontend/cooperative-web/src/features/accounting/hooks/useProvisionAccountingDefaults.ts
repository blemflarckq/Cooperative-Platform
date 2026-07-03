import { useMutation, useQueryClient } from "@tanstack/react-query";
import { provisionDefaultAccountingSettings } from "../api/accounting.api";

export function useProvisionAccountingDefaults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: provisionDefaultAccountingSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}