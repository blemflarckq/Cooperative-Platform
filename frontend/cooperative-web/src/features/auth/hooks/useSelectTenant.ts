import { useMutation } from "@tanstack/react-query";
import { selectTenantRequest } from "@/features/auth/api/auth.api";

export function useSelectTenant() {
  return useMutation({
    mutationFn: selectTenantRequest,
  });
}
