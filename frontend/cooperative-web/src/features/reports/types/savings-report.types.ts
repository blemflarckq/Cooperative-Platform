export interface SavingsStatementTotals {
  postedContributionCount: number;
  reversedContributionCount: number;
  totalPosted: string;
  totalReversed: string;
  netSavings: string;
}

export interface MemberSavingsStatementLine {
  id: string;
  reference: string;
  contributionDate: string;
  amount: string;
  source: string;
  status: string;
  notes?: string | null;
}

export interface MemberSavingsStatement {
  tenantId: string;
  tenantUserId: string;
  dateFrom?: string;
  dateTo?: string;
  totals: SavingsStatementTotals;
  lines: MemberSavingsStatementLine[];
}

export interface CycleSavingsSummaryMember {
  tenantUserId: string;
  fullName?: string;
  email?: string;
  postedContributionCount: number;
  reversedContributionCount: number;
  totalPosted: string;
  totalReversed: string;
  netSavings: string;
}

export interface CycleSavingsSummary {
  tenantId: string;
  cycleId: string;
  totals: {
    participantCountWithContributions: number;
    totalPosted: string;
    totalReversed: string;
    netSavings: string;
  };
  members: CycleSavingsSummaryMember[];
}