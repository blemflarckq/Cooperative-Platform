import { useMutation, useQueryClient } from "@tanstack/react-query";
import { activateScheme } from "@/features/schemes/api/schemes.api";
import { schemeQueryKeys } from "./scheme-query-keys";

export function useActivateScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateScheme,
    onSuccess: async (scheme) => {
      await queryClient.invalidateQueries({
        queryKey: schemeQueryKeys.lists(),
      });

      await queryClient.invalidateQueries({
        queryKey: schemeQueryKeys.detail(scheme.id),
      });
    },
  });
}