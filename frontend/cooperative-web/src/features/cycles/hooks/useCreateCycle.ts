import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCycle } from "../api/cycles.api";
import { cycleQueryKeys } from "./cycle-query-keys";

interface Input {
  schemeId: string;
  values: {
    name: string;
    code: string;
    startsOn?: string;
    endsOn?: string;
    targetAmount?: number;
  };
}

export function useCreateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schemeId, values }: Input) =>
      createCycle(schemeId, values),

    onSuccess: async (cycle) => {
      await queryClient.invalidateQueries({
        queryKey: cycleQueryKeys.byScheme(cycle.schemeId),
      });
    },
  });
}