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

export interface LoanAllocationLine {
  loanId: string;
  amount: string;
}

export interface RemainderAllocation {
  cycleId: string;
  amount: string;
}

export interface AllocatePaymentRequest {
  totalAmount: string;
  loanAllocations: LoanAllocationLine[];
  remainder?: RemainderAllocation;
}

export interface AllocatePaymentResult {
  loansRepaid: LoanAllocationLine[];
  remainderRecorded: RemainderAllocation | null;
}
