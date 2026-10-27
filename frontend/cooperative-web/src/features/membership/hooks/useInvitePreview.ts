import { useQuery } from "@tanstack/react-query";
import { getInvitePreviewRequest } from "../api/membership.api";

export function useInvitePreview(token: string | undefined) {
  return useQuery({
    queryKey: ["membership", "invite-preview", token],
    queryFn: () => getInvitePreviewRequest(token as string),
    enabled: Boolean(token),
    retry: false,
  });
}
