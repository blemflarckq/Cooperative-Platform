import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { updateScheme } from "@/features/schemes/api/schemes.api";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { type UpdateSchemeRequest } from "@/features/schemes/types/scheme.types";
import { schemeQueryKeys } from "./scheme-query-keys";

interface Input {
  schemeId: string;
  values: UpdateSchemeRequest;
}

export function useUpdateScheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schemeId, values }: Input) => updateScheme(schemeId, values),

    onSuccess: async (scheme) => {
      await queryClient.invalidateQueries({
        queryKey: schemeQueryKeys.lists(),
      });

      await queryClient.invalidateQueries({
        queryKey: schemeQueryKeys.detail(scheme.id),
      });

      toast.success("Changes saved");
    },

    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
