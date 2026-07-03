import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCycleParticipant } from "../api/cycle-participants.api";
import { cycleParticipantQueryKeys } from "./cycle-participant-query-keys";

interface Input {
  cycleId: string;
  tenantUserId: string;
}

export function useCreateCycleParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cycleId, tenantUserId }: Input) =>
      createCycleParticipant(cycleId, { tenantUserId }),

    onSuccess: async (participant) => {
      await queryClient.invalidateQueries({
        queryKey: cycleParticipantQueryKeys.byCycle(participant.cycleId),
      });
    },
  });
}