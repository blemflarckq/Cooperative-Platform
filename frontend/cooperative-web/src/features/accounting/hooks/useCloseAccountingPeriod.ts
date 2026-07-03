import { useMutation, useQueryClient } from "@tanstack/react-query";
import { closeAccountingPeriod } from "../api/accounting-periods.api";

export function useCloseAccountingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeAccountingPeriod,
    onSuccess: async (period) => {
      await queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
      await queryClient.invalidateQueries({
        queryKey: ["accounting-periods", "detail", period.id],
      });
    },
  });
}