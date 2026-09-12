import { useMutation } from "@tanstack/react-query";
import { setMobileRequest } from "@/features/auth/api/auth.api";

export function useSetMobile() {
  return useMutation({
    mutationFn: setMobileRequest,
  });
}
