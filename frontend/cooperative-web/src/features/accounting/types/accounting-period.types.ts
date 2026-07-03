export type AccountingPeriodStatus = "OPEN" | "CLOSED";

export interface AccountingPeriod {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status: AccountingPeriodStatus;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountingPeriodRequest {
  name: string;
  startsOn: string;
  endsOn: string;
}