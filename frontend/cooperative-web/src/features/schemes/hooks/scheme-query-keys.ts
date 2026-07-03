export const schemeQueryKeys = {
  all: ["schemes"] as const,
  lists: () => [...schemeQueryKeys.all, "list"] as const,
  list: () => [...schemeQueryKeys.lists()] as const,
  details: () => [...schemeQueryKeys.all, "detail"] as const,
  detail: (schemeId: string) =>
    [...schemeQueryKeys.details(), schemeId] as const,
};