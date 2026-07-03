import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  activateScheme,
  archiveScheme,
  suspendScheme,
} from "@/features/schemes/api/schemes.api";
import { schemeQueryKeys } from "./scheme-query-keys";

type SchemeTransition = "activate" | "suspend" | "archive";

export function useSchemeTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      schemeId,
      transition,
    }: {
      schemeId: string;
      transition: SchemeTransition;
    }) => {
      switch (transition) {
        case "activate":
          return activateScheme(schemeId);
        case "suspend":
          return suspendScheme(schemeId);
        case "archive":
          return archiveScheme(schemeId);
      }
    },
    onSuccess: async (scheme) => {
      await queryClient.invalidateQueries({ queryKey: schemeQueryKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: schemeQueryKeys.detail(scheme.id),
      });
    },
  });
}