export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "INCOME"
  | "EXPENSE";

export type NormalBalance = "DEBIT" | "CREDIT";

export type AccountStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface Account {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  type: AccountType;
  normalBalance: NormalBalance;
  status: AccountStatus;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  normalBalance: NormalBalance;
}

export interface UpdateAccountRequest {
  name?: string;
  description?: string;
}

export interface AccountingSettings {
  id: string;
  tenantId: string;
  cashAccountId: string | null;
  memberSavingsLiabilityAccountId: string | null;
  loanReceivableAccountId: string | null;
  interestIncomeAccountId: string | null;
  penaltyIncomeAccountId: string | null;
  accounts?: {
    cash?: Account | null;
    memberSavingsLiability?: Account | null;
    loanReceivable?: Account | null;
    interestIncome?: Account | null;
    penaltyIncome?: Account | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAccountingSettingsRequest {
  cashAccountId: string;
  memberSavingsLiabilityAccountId: string;
  loanReceivableAccountId: string;
  interestIncomeAccountId: string;
  penaltyIncomeAccountId: string;
}

export interface ProvisionDefaultsRequest {
  cashAccountName: string;
}