import { useQuery } from "@tanstack/react-query";
import { getTenantUsers } from "@/features/tenant-users/api/tenant-users.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";

export function useTenantUsers() {
  return useQuery({
    queryKey: tenantUserQueryKeys.list(),
    queryFn: getTenantUsers,
  });
}