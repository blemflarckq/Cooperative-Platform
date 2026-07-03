import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccount } from "../api/accounting.api";

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}