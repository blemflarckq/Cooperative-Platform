export type LeadMeasureType = "streak" | "project_progress" | "own_total" | "collective_balance";

export interface SchemeLeadMeasure {
  schemeId: string;
  schemeName: string;
  measureType: LeadMeasureType;
  streak?: { completedMonths: number; hasContributedThisMonth: boolean };
  projectProgress?: { raisedAmount: string; targetAmount: string | null; percentage: number | null };
  ownTotal?: { amount: string };
  collectiveBalance?: { amount: string };
}

export interface PersonalActionItem {
  type: "unallocated_payment" | "loan_repayment_due";
  amount: string;
  detail: string;
  relatedId: string;
}

export interface MemberDashboardData {
  schemes: SchemeLeadMeasure[];
  actionItems: PersonalActionItem[];
  tenantSummary: {
    activeMemberCount: number;
    activeSchemeCount: number;
  };
}
