import { useQuery } from "@tanstack/react-query";
import { getOutboundRequestsForScheme } from "../api/approvals.api";
import { approvalQueryKeys } from "./approval-query-keys";

export function useSchemeOutboundRequests(schemeId: string) {
  return useQuery({
    queryKey: approvalQueryKeys.byScheme(schemeId),
    queryFn: () => getOutboundRequestsForScheme(schemeId),
    enabled: Boolean(schemeId),
  });
}
