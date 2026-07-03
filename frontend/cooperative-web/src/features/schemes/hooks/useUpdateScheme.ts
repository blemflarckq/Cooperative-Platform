import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateScheme } from "@/features/schemes/api/schemes.api";
import { schemeQueryKeys } from "./scheme-query-keys";
import { type UpdateSchemeRequest } from "@/features/schemes/types/scheme.types";

interface Input {
  schemeId: string;
  values: UpdateSchemeRequest;
}

export function useUpdateScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schemeId, values }: Input) =>
      updateScheme(schemeId, values),

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