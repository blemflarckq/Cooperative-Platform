import { useQuery } from "@tanstack/react-query";
import { getUnallocatedPayments } from "../api/payment-allocation.api";

export function useUnallocatedPayments(tenantUserId: string) {
  return useQuery({
    queryKey: ["payment-allocation", "unallocated", tenantUserId],
    queryFn: () => getUnallocatedPayments(tenantUserId),
    enabled: Boolean(tenantUserId),
  });
}
