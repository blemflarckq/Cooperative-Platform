export type RecordedPaymentStatus = "UNALLOCATED" | "ALLOCATED";

export interface RecordedPayment {
  id: string;
  tenantId: string;
  tenantUserId: string;
  amount: string;
  recordedByTenantUserId: string;
  recordedAt: string;
  status: RecordedPaymentStatus;
  notes: string | null;
  allocatedAt: string | null;
  allocatedByTenantUserId: string | null;
}

export interface OutstandingLoanObligation {
  loanId: string;
  schemeId: string;
  schemeName: string;
  isAtRiskFlagged: boolean;
  currentRate: string;
  payoffAmount: string;
}

export interface RemainderTarget {
  cycleId: string;
  schemeId: string;
  schemeName: string;
}

export interface OutstandingObligations {
  loans: OutstandingLoanObligation[];
  remainderTargets: RemainderTarget[];
}

export interface RecordPaymentRequest {
  tenantUserId: string;
  amount: string;
  notes?: string;
}

export interface LoanAllocationLine {
  loanId: string;
  amount: string;
}

export interface RemainderAllocation {
  cycleId: string;
  amount: string;
}

export interface AllocatePaymentRequest {
  loanAllocations: LoanAllocationLine[];
  remainder?: RemainderAllocation;
}

export interface AllocatePaymentResult {
  loansRepaid: LoanAllocationLine[];
  remainderRecorded: RemainderAllocation | null;
}
