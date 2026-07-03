import { useQuery } from "@tanstack/react-query";
import { getAccountById } from "../api/accounting.api";

export function useAccount(accountId: string) {
  return useQuery({
    queryKey: ["accounts", "detail", accountId],
    queryFn: () => getAccountById(accountId),
    enabled: Boolean(accountId),
  });
}