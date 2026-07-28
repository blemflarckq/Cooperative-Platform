export enum CycleMode {
  FIXED_PERIOD = "FIXED_PERIOD",
  OPEN_ENDED = "OPEN_ENDED",
  PROJECT_BASED = "PROJECT_BASED",
}

export enum ContributionMode {
  MONTHLY_FIXED = "MONTHLY_FIXED",
  EVENT_TRIGGERED = "EVENT_TRIGGERED",
  VOLUNTARY = "VOLUNTARY",
  PROJECT_TARGET = "PROJECT_TARGET",
}

export enum LoanMode {
  DISABLED = "DISABLED",
  SELF_BACKED = "SELF_BACKED",
  PEER_FUNDED = "PEER_FUNDED",
  SELF_AND_PEER_FUNDED = "SELF_AND_PEER_FUNDED",
}

export enum PayoutMode {
  END_OF_CYCLE = "END_OF_CYCLE",
  NO_PAYOUT = "NO_PAYOUT",
  EVENT_BENEFICIARY = "EVENT_BENEFICIARY",
  PROJECT_EXPENSE = "PROJECT_EXPENSE",
}

export enum SchemeStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  ARCHIVED = "ARCHIVED",
}

export enum OperatingCycleStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  PAUSED = "PAUSED",
  CLOSED = "CLOSED",
  CANCELLED = "CANCELLED",
}

export enum CycleParticipantStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  EXITED = "EXITED",
  REMOVED = "REMOVED",
}

/**
 * Controls how contribution activity is surfaced to ordinary members
 * within a scheme — configurable by the group's leader, not a global
 * platform setting. FULL_TRANSPARENCY shows individual contribution
 * amounts across the group; RANKING shows relative standing ("you rank
 * 5th this cycle") without exposing exact figures.
 */
export enum SchemeVisibilityMode {
  FULL_TRANSPARENCY = "FULL_TRANSPARENCY",
  RANKING = "RANKING",
}