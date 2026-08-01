export const loanQueryKeys = {
  all: ["loans"] as const,
  byScheme: (schemeId: string) => [...loanQueryKeys.all, "scheme", schemeId] as const,
  detail: (loanId: string) => [...loanQueryKeys.all, "detail", loanId] as const,
  preview: (schemeId: string, amount: string) =>
    [...loanQueryKeys.all, "preview", schemeId, amount] as const,
};
