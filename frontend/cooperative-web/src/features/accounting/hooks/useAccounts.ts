import { useQuery } from "@tanstack/react-query";
import { getAccounts } from "../api/accounting.api";

export function useAccounts(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ["accounts", "list", params],
    queryFn: () => getAccounts(params),
  });
}