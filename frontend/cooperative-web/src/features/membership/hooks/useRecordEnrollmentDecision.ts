import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";
import { recordEnrollmentDecisionRequest } from "../api/membership.api";
import { pendingEnrollmentsQueryKey } from "./usePendingEnrollments";

/**
 * Toasts live here, not in per-call callbacks: once a request resolves
 * it drops out of the pending list, so the card that triggered the
 * mutation can be gone before a per-call callback would run.
 */
export function useRecordEnrollmentDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordEnrollmentDecisionRequest,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: pendingEnrollmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: tenantUserQueryKeys.all });

      if (result.status === "APPROVED") {
        toast.success("Approved — they're now a member");
      } else if (result.status === "REJECTED") {
        toast.success("Request declined");
      } else {
        toast.success("Your approval is recorded — one more is needed");
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
