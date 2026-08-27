import { useQuery } from "@tanstack/react-query";
import { searchTenantUsers } from "@/features/tenant-users/api/tenant-users.api";

export function useTenantUserSearch(query: string) {
  return useQuery({
    queryKey: ["tenant-users", "search", query],
    queryFn: () => searchTenantUsers(query),
    enabled: query.trim().length >= 2,
  });
}
