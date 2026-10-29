import { useQuery } from "@tanstack/react-query";
import { getMyTenantsRequest } from "../api/auth.api";

export const myTenantsQueryKey = ["auth", "my-tenants"] as const;

/**
 * Every cooperative the signed-in person belongs to. Refreshed when the
 * window regains focus (react-query's default), so a cooperative they've
 * just been admitted to shows up without signing out.
 */
export function useMyTenants() {
  return useQuery({
    queryKey: myTenantsQueryKey,
    queryFn: getMyTenantsRequest,
    staleTime: 60_000,
    retry: false,
  });
}
