import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reverseContribution } from "../api/contributions.api";

interface Input {
  contributionId: string;
  reason: string;
  cycleId?: string;
}

export function useReverseContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contributionId, reason }: Input) =>
      reverseContribution(contributionId, { reason }),

    onSuccess: async (_contribution, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["contributions"],
      });

      if (variables.cycleId) {
        await queryClient.invalidateQueries({
          queryKey: ["contributions", "cycle", variables.cycleId],
        });
      }
    },
  });
}