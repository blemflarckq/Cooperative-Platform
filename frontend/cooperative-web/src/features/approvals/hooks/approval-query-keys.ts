export const approvalQueryKeys = {
  all: ["outbound-requests"] as const,
  byScheme: (schemeId: string) =>
    [...approvalQueryKeys.all, "scheme", schemeId] as const,
};
