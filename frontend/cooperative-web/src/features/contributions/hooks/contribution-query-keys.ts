export const contributionQueryKeys = {
  all: ["contributions"] as const,

  byCycle: (cycleId: string, params: unknown) =>
    [...contributionQueryKeys.all, "cycle", cycleId, params] as const,

  byMember: (tenantUserId: string, params: unknown) =>
    [...contributionQueryKeys.all, "member", tenantUserId, params] as const,
};