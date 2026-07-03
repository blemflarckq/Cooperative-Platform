export const cycleQueryKeys = {
  all: ["cycles"] as const,

  lists: () => [...cycleQueryKeys.all, "list"] as const,

  byScheme: (schemeId: string) =>
    [...cycleQueryKeys.lists(), "scheme", schemeId] as const,

  details: () => [...cycleQueryKeys.all, "detail"] as const,

  detail: (cycleId: string) =>
    [...cycleQueryKeys.details(), cycleId] as const,
};