import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelCycle,
  closeCycle,
  openCycle,
  pauseCycle,
} from "@/features/cycles/api/cycles.api";
import { cycleQueryKeys } from "./cycle-query-keys";

type CycleTransition = "open" | "pause" | "close" | "cancel";

interface Input {
  cycleId: string;
  transition: CycleTransition;
}

export function useCycleTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cycleId, transition }: Input) => {
      switch (transition) {
        case "open":
          return openCycle(cycleId);
        case "pause":
          return pauseCycle(cycleId);
        case "close":
          return closeCycle(cycleId);
        case "cancel":
          return cancelCycle(cycleId);
      }
    },
    onSuccess: async (cycle) => {
      await queryClient.invalidateQueries({
        queryKey: cycleQueryKeys.detail(cycle.id),
      });

      await queryClient.invalidateQueries({
        queryKey: cycleQueryKeys.byScheme(cycle.schemeId),
      });
    },
  });
}