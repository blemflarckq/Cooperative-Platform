import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  exitCycleParticipant,
  reactivateCycleParticipant,
  removeCycleParticipant,
  suspendCycleParticipant,
} from "../api/cycle-participants.api";
import { cycleParticipantQueryKeys } from "./cycle-participant-query-keys";

type ParticipantTransition = "suspend" | "reactivate" | "exit" | "remove";

interface Input {
  participantId: string;
  transition: ParticipantTransition;
}

export function useCycleParticipantTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ participantId, transition }: Input) => {
      switch (transition) {
        case "suspend":
          return suspendCycleParticipant(participantId);
        case "reactivate":
          return reactivateCycleParticipant(participantId);
        case "exit":
          return exitCycleParticipant(participantId);
        case "remove":
          return removeCycleParticipant(participantId);
      }
    },

    onSuccess: async (participant) => {
      await queryClient.invalidateQueries({
        queryKey: cycleParticipantQueryKeys.byCycle(participant.cycleId),
      });

      await queryClient.invalidateQueries({
        queryKey: cycleParticipantQueryKeys.detail(participant.id),
      });
    },
  });
}