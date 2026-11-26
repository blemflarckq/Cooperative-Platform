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

/** What still stands in the way of archiving a scheme. Only on the single-scheme response. */
export interface ArchiveBlockers {
  /** Cycles that are open or paused. */
  runningCycles: number;
  /** Loans not yet fully repaid, including requests still being approved. */
  unpaidLoans: number;
}

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
  activatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  archiveBlockers?: ArchiveBlockers;
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

export type UpdateSchemeRequest = Partial<CreateSchemeRequest>;

/** The four rules a scheme runs by. Fixed once the scheme is activated. */
export type SchemeModeField =
  | "cycleMode"
  | "contributionMode"
  | "loanMode"
  | "payoutMode";
