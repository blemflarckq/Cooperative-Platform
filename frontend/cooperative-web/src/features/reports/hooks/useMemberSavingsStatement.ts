import { useQuery } from "@tanstack/react-query";
import { getMemberSavingsStatement } from "../api/savings-reports.api";

export function useMemberSavingsStatement(
  tenantUserId: string,
  params: {
    dateFrom?: string;
    dateTo?: string;
  },
) {
  return useQuery({
    queryKey: ["savings-statement", "member", tenantUserId, params],
    queryFn: () => getMemberSavingsStatement(tenantUserId, params),
    enabled: Boolean(tenantUserId),
  });
}