import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { generateInviteLinkRequest } from "../api/membership.api";

export function useGenerateInviteLink() {
  return useMutation({
    mutationFn: () => generateInviteLinkRequest(),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
