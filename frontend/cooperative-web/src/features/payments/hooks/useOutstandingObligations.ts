import { useQuery } from "@tanstack/react-query";
import { getOutstandingObligations } from "../api/payment-allocation.api";

export function useOutstandingObligations(tenantUserId: string) {
  return useQuery({
    queryKey: ["payment-allocation", "obligations", tenantUserId],
    queryFn: () => getOutstandingObligations(tenantUserId),
    enabled: Boolean(tenantUserId),
  });
}
