import type { AtCapBehavior } from "./loan.types";

export type RateScheduleMode = "RAMP" | "PERIODS";

/**
 * Peer-funded rates are described by two different shapes sharing some
 * fields: in RAMP mode, peerBaseMonthlyRate is the starting rate and
 * peerCapRate the ceiling; in PERIODS mode they are the initial rate and
 * the cut-off rate. The server stores one set of columns either way.
 */
export interface LoanPolicy {
  id: string;
  schemeId: string;
  selfFundedMonthlyRate: string;
  peerBaseMonthlyRate: string;
  peerMonthlyRateIncrement: string;
  peerCapRate: string;
  atCapBehavior: AtCapBehavior;
  rateScheduleMode: RateScheduleMode;
  initialPeriodMonths: number | null;
  laterPeriodMonths: number | null;
  peerLaterMonthlyRate: string | null;
  isReviewed: boolean;
  updatedAt: string;
}

export interface UpsertLoanPolicyRequest {
  selfFundedMonthlyRate: string;
  peerBaseMonthlyRate: string;
  peerMonthlyRateIncrement: string;
  peerCapRate: string;
  atCapBehavior: AtCapBehavior;
  rateScheduleMode: RateScheduleMode;
  initialPeriodMonths?: number;
  laterPeriodMonths?: number;
  peerLaterMonthlyRate?: string;
}
