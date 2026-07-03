import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccountingPeriod } from "../api/accounting-periods.api";

export function useCreateAccountingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccountingPeriod,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounting-periods"] });
    },
  });
}