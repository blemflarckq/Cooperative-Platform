export type SchemeStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type CycleMode = "FIXED_PERIOD" | "OPEN_ENDED" | "PROJECT_BASED";

export type ContributionMode =
  | "MONTHLY_FIXED"
  | "EVENT_TRIGGERED"
  | "VOLUNTARY"
  | "PROJECT_TARGET";

export type LoanMode =
  | "DISABLED"
  | "SELF_BACKED"
  | "PEER_FUNDED"
  | "SELF_AND_PEER_FUNDED";

export type PayoutMode =
  | "END_OF_CYCLE"
  | "NO_PAYOUT"
  | "EVENT_BENEFICIARY"
  | "PROJECT_EXPENSE";

export interface Scheme {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string | null;
  status: SchemeStatus;
  cycleMode: CycleMode;
  contributionMode: ContributionMode;
  loanMode: LoanMode;
  payoutMode: PayoutMode;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchemeRequest {
  name: string;
  description?: string;
  code?: string;
  cycleMode: CycleMode;
  contributionMode: ContributionMode;
  loanMode: LoanMode;
  payoutMode: PayoutMode;
}

export type UpdateSchemeRequest = Partial<CreateSchemeRequest>