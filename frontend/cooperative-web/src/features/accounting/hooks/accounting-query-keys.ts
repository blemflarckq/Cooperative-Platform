export const accountingQueryKeys = {
  accounts: ["accounts"] as const,
  accountList: (params: unknown) =>
    [...accountingQueryKeys.accounts, "list", params] as const,
  accountDetail: (id: string) =>
    [...accountingQueryKeys.accounts, "detail", id] as const,

  settings: ["accounting-settings"] as const,
};