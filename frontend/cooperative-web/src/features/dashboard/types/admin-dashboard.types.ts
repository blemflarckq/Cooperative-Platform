export interface AdminDashboardData {
  activeMemberCount: number;
  activeSchemeCount: number;
  loanPortfolio: {
    totalOutstanding: string;
    atRiskAmount: string;
    atRiskPercentage: number | null;
    oldestAtRiskDays: number | null;
  };
  approvals: {
    pendingOverThresholdCount: number;
    thresholdDays: number;
    longestPendingDays: number | null;
  };
}
