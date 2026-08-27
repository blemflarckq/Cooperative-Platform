import { useQuery } from "@tanstack/react-query";
import { getCurrentTenantUser } from "../api/tenant-users.api";

export function useCurrentTenantUser() {
  return useQuery({
    queryKey: ["tenant-users", "me"],
    queryFn: () => getCurrentTenantUser(),
    staleTime: 5 * 60 * 1000,
  });
}
