import { useMutation } from "@tanstack/react-query";
import { createTenantRequest } from "@/features/auth/api/auth.api";

export function useCreateTenant() {
  return useMutation({
    mutationFn: createTenantRequest,
  });
}
