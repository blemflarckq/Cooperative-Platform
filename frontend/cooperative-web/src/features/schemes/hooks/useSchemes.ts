import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type ListQueryParams } from "@/lib/api/pagination.types";
import { getSchemes } from "@/features/schemes/api/schemes.api";
import { schemeQueryKeys } from "./scheme-query-keys";

export function useSchemes(params: ListQueryParams) {
  return useQuery({
    queryKey: [...schemeQueryKeys.list(), params],
    queryFn: () => getSchemes(params),
    // Keep showing the last page while the next one loads, so typing in the
    // search box doesn't blank the list (and the box itself) on every keystroke.
    placeholderData: keepPreviousData,
  });
}
