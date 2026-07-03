import { useQuery } from "@tanstack/react-query";
import { type ListQueryParams } from "@/lib/api/pagination.types";
import { getSchemes } from "@/features/schemes/api/schemes.api";
import { schemeQueryKeys } from "./scheme-query-keys";

export function useSchemes(params: ListQueryParams) {
  return useQuery({
    queryKey: [...schemeQueryKeys.list(), params],
    queryFn: () => getSchemes(params),
  });
}