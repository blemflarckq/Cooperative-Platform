import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { acceptInviteRequest } from "../api/membership.api";

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (token: string) => acceptInviteRequest(token),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
