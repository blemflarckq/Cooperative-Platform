import { useQuery } from "@tanstack/react-query";
import { getAccountingSettings } from "../api/accounting.api";
import { accountingQueryKeys } from "./accounting-query-keys";

export function useAccountingSettings() {
  return useQuery({
    queryKey: accountingQueryKeys.settings,
    queryFn: getAccountingSettings,
  });
}