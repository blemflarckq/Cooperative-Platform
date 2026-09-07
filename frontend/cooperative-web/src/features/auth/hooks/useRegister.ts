import { useMutation } from "@tanstack/react-query";
import { registerRequest } from "@/features/auth/api/auth.api";

export function useRegister() {
  return useMutation({
    mutationFn: registerRequest,
  });
}
