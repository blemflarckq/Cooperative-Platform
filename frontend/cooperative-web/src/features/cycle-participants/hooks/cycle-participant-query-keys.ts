export const cycleParticipantQueryKeys = {
  all: ["cycle-participants"] as const,

  lists: () => [...cycleParticipantQueryKeys.all, "list"] as const,

  byCycle: (cycleId: string) =>
    [...cycleParticipantQueryKeys.lists(), "cycle", cycleId] as const,

  details: () => [...cycleParticipantQueryKeys.all, "detail"] as const,

  detail: (participantId: string) =>
    [...cycleParticipantQueryKeys.details(), participantId] as const,
};