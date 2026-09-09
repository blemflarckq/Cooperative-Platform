import { useMutation } from "@tanstack/react-query";
import { oauthCompleteRequest } from "@/features/auth/api/auth.api";

export function useOAuthComplete() {
  return useMutation({
    mutationFn: oauthCompleteRequest,
  });
}
