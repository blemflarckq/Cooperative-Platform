import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkCreateCycleParticipants } from "../api/cycle-participants.api";
import { cycleParticipantQueryKeys } from "./cycle-participant-query-keys";

interface Input {
  cycleId: string;
  tenantUserIds: string[];
}

export function useBulkCreateCycleParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cycleId, tenantUserIds }: Input) =>
      bulkCreateCycleParticipants(cycleId, { tenantUserIds }),

    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: cycleParticipantQueryKeys.byCycle(variables.cycleId),
      });
    },
  });
}