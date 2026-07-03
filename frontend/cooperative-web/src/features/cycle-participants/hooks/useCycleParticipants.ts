import { useQuery } from "@tanstack/react-query";
import { getCycleParticipants } from "../api/cycle-participants.api";
import { cycleParticipantQueryKeys } from "./cycle-participant-query-keys";
import type { ListQueryParams } from "@/lib/api/pagination.types";

export function useCycleParticipants(
  cycleId: string,
  params: ListQueryParams = {},
) {
  return useQuery({
    queryKey: [...cycleParticipantQueryKeys.byCycle(cycleId), params],
    queryFn: () => getCycleParticipants(cycleId, params),
    enabled: Boolean(cycleId),
  });
}