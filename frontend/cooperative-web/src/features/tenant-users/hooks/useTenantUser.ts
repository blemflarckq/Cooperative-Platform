import { useQuery } from "@tanstack/react-query";
import { getTenantUserById } from "@/features/tenant-users/api/tenant-users.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";

export function useTenantUser(tenantUserId: string) {
  return useQuery({
    queryKey: tenantUserQueryKeys.detail(tenantUserId),
    queryFn: () => getTenantUserById(tenantUserId),
    enabled: Boolean(tenantUserId),
  });
}