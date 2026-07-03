import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createContribution } from "../api/contributions.api";

interface Input {
  cycleId: string;
  values: Parameters<typeof createContribution>[1];
}

export function useCreateContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cycleId, values }: Input) =>
      createContribution(cycleId, values),

    onSuccess: async (_contribution, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["contributions", "cycle", variables.cycleId],
      });
    },
  });
}