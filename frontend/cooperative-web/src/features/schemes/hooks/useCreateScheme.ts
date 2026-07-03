import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createScheme } from "@/features/schemes/api/schemes.api";
import { schemeQueryKeys } from "./scheme-query-keys";

export function useCreateScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createScheme,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: schemeQueryKeys.lists(),
      });
    },
  });
}