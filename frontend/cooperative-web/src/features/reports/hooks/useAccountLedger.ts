import { useQuery } from "@tanstack/react-query";
import { getAccountLedger } from "../api/accounting-reports.api";

export function useAccountLedger(
  accountId: string,
  params: {
    dateFrom?: string;
    dateTo?: string;
  },
) {
  return useQuery({
    queryKey: ["reports", "account-ledger", accountId, params],
    queryFn: () => getAccountLedger(accountId, params),
    enabled: Boolean(accountId),
  });
}