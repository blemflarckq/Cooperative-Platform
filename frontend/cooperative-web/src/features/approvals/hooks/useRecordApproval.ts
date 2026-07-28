import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordOutboundApproval } from "../api/approvals.api";
import type { ApprovalDecision } from "../types/approval.types";
import { approvalQueryKeys } from "./approval-query-keys";

interface Input {
  schemeId: string;
  requestId: string;
  decision: ApprovalDecision;
  comment?: string;
}

export function useRecordApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schemeId, requestId, decision, comment }: Input) =>
      recordOutboundApproval(schemeId, requestId, { decision, comment }),

    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: approvalQueryKeys.byScheme(variables.schemeId),
      });
    },
  });
}
