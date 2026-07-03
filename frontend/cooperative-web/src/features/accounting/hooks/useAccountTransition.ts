import { useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveAccount, deactivateAccount } from "../api/accounting.api";

type AccountTransition = "deactivate" | "archive";

export function useAccountTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      transition,
    }: {
      accountId: string;
      transition: AccountTransition;
    }) => {
      if (transition === "deactivate") return deactivateAccount(accountId);
      return archiveAccount(accountId);
    },
    onSuccess: async (account) => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({
        queryKey: ["accounts", "detail", account.id],
      });
    },
  });
}