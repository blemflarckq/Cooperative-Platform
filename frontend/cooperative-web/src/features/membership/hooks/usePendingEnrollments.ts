import { useQuery } from "@tanstack/react-query";
import { getPendingEnrollmentsRequest } from "../api/membership.api";

export const pendingEnrollmentsQueryKey = ["membership", "pending-enrollments"] as const;

export function usePendingEnrollments() {
  return useQuery({
    queryKey: pendingEnrollmentsQueryKey,
    queryFn: getPendingEnrollmentsRequest,
    // An invite is meant to be handled live — admin and new member on a
    // call together — so a request someone just submitted should appear
    // without the approver having to refresh.
    refetchInterval: 15_000,
  });
}
