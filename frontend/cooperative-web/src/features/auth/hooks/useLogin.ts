import { useMutation } from "@tanstack/react-query";
import { loginRequest } from "@/features/auth/api/auth.api";

export function useLogin() {
  return useMutation({
    mutationFn: loginRequest,
  });
}