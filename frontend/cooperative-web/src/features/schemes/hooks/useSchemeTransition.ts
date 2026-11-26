import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  activateScheme,
  archiveScheme,
  suspendScheme,
} from "@/features/schemes/api/schemes.api";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { schemeQueryKeys } from "./scheme-query-keys";
import { useSchemeWords } from "./useSchemeWords";

/**
 * "resume" is the same call as "activate" — the server treats bringing a
 * suspended scheme back as activating it again — but it earns its own
 * word so the confirmation says what actually happened.
 */
export type SchemeTransition = "activate" | "resume" | "suspend" | "archive";

export function useSchemeTransition() {
  const queryClient = useQueryClient();
  const { Noun } = useSchemeWords();

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
        case "resume":
          return activateScheme(schemeId);
        case "suspend":
          return suspendScheme(schemeId);
        case "archive":
          return archiveScheme(schemeId);
      }
    },
    onSuccess: async (scheme, { transition }) => {
      await queryClient.invalidateQueries({ queryKey: schemeQueryKeys.lists() });
      await queryClient.invalidateQueries({
        queryKey: schemeQueryKeys.detail(scheme.id),
      });

      toast.success(
        {
          activate: `${Noun} is active`,
          resume: `${Noun} resumed`,
          suspend: `${Noun} suspended`,
          archive: `${Noun} archived`,
        }[transition],
      );
    },
    // The server's own sentence — for an archive that's the list of what is
    // still open — rather than a generic failure.
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
