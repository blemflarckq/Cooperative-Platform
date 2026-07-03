import { useQuery } from "@tanstack/react-query";
import { getSchemeById } from "@/features/schemes/api/schemes.api";
import { schemeQueryKeys } from "./scheme-query-keys";

export function useScheme(schemeId: string) {
  return useQuery({
    queryKey: schemeQueryKeys.detail(schemeId),
    queryFn: () => getSchemeById(schemeId),
    enabled: Boolean(schemeId),
  });
}