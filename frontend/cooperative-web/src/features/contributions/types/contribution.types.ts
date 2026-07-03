export type ContributionStatus = "POSTED" | "REVERSED";

export type ContributionSource =
  | "CASH"
  | "BANK_TRANSFER"
  | "MOBILE_MONEY"
  | "OTHER";

export interface Contribution {
  id: string;
  tenantId: string;
  cycleId: string;
  tenantUserId: string;
  reference: string;
  contributionDate: string;
  amount: string;
  source: ContributionSource;
  status: ContributionStatus;
  journalEntryId: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContributionRequest {
  tenantUserId: string;
  contributionDate: string;
  amount: string;
  source: ContributionSource;
  notes?: string;
}

export interface ReverseContributionRequest {
  reason: string;
}