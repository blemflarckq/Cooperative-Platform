export type LoanStatus =
  | "PENDING_PLEDGES"
  | "PENDING_APPROVAL"
  | "ACTIVE"
  | "AT_RISK"
  | "REPAID";

export type AtCapBehavior = "CONTINUE_AT_CAP" | "FLAG_AND_BLOCK";

export interface LoanMemberSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface LoanPledge {
  id: string;
  tenantId: string;
  loanId: string;
  pledgingTenantUserId: string;
  pledgedAmount: string;
  outstandingPrincipal: string;
  pledgedAt: string;
  createdAt: string;
  updatedAt: string;
  pledgingTenantUser?: {
    id: string;
    user: LoanMemberSummary | null;
  };
}

export interface Loan {
  id: string;
  tenantId: string;
  schemeId: string;
  cycleId: string;
  borrowerTenantUserId: string;
  principalAmount: string;
  selfFundedPrincipal: string;
  selfFundedOutstandingPrincipal: string;
  selfFundedMonthlyRate: string;
  peerFundedPrincipal: string;
  peerFundedOutstandingPrincipal: string;
  currentPeerMonthlyRate: string;
  peerMonthlyRateIncrement: string;
  peerCapRate: string;
  atCapBehavior: AtCapBehavior;
  peerRateLastEscalatedAt: string | null;
  status: LoanStatus;
  isAtRiskFlagged: boolean;
  outboundRequestId: string | null;
  createdAt: string;
  updatedAt: string;
  pledges?: LoanPledge[];
  borrower?: {
    id: string;
    user: LoanMemberSummary | null;
  };
}

export interface LoanSplitPreview {
  selfFundedPrincipal: string;
  peerFundedPrincipal: string;
}

export interface RequestLoanRequest {
  amount: string;
  purpose: string;
}

export interface PledgeLoanRequest {
  pledgedAmount: string;
}

export interface RecordRepaymentRequest {
  amount: string;
}
