import { type ExperienceMode } from "@/lib/experience/experience-mode";

export type DomainTerm =
  | "tenant"
  | "tenantUser"
  | "user"
  | "role"
  | "permission"
  | "scheme"
  | "cycle"
  | "participant"
  | "contribution"
  | "contributionSource"
  | "payout"
  | "loan"
  | "loanRepayment"
  | "journalEntry"
  | "journalLine"
  | "account"
  | "chartOfAccounts"
  | "accountingSettings"
  | "accountingPeriod"
  | "trialBalance"
  | "accountLedger"
  | "savingsStatement"
  | "savingsSummary"
  | "reversal"
  | "auditTrail";

interface TermPresentation {
  community: string;
  professional: string;
}

const terminology: Record<DomainTerm, TermPresentation> = {
  tenant: {
    community: "Community",
    professional: "Organization",
  },
  tenantUser: {
    community: "Person",
    professional: "Tenant User",
  },
  user: {
    community: "Person",
    professional: "User",
  },
  role: {
    community: "Responsibility",
    professional: "Role",
  },
  permission: {
    community: "Access Right",
    professional: "Permission",
  },
  scheme: {
    community: "Group Fund",
    professional: "Scheme",
  },
  cycle: {
    community: "Activity Period",
    professional: "Operating Cycle",
  },
  participant: {
    community: "Member",
    professional: "Cycle Participant",
  },
  contribution: {
    community: "Money Received",
    professional: "Contribution",
  },
  contributionSource: {
    community: "Payment Method",
    professional: "Contribution Source",
  },
  payout: {
    community: "Money Paid Out",
    professional: "Payout",
  },
  loan: {
    community: "Loan",
    professional: "Loan",
  },
  loanRepayment: {
    community: "Loan Payment",
    professional: "Loan Repayment",
  },
  journalEntry: {
    community: "Financial Record",
    professional: "Journal Entry",
  },
  journalLine: {
    community: "Record Line",
    professional: "Journal Line",
  },
  account: {
    community: "Money Category",
    professional: "Account",
  },
  chartOfAccounts: {
    community: "How Money Is Tracked",
    professional: "Chart of Accounts",
  },
  accountingSettings: {
    community: "Money Tracking Setup",
    professional: "Accounting Settings",
  },
  accountingPeriod: {
    community: "Money Tracking Period",
    professional: "Accounting Period",
  },
  trialBalance: {
    community: "Financial Health Check",
    professional: "Trial Balance",
  },
  accountLedger: {
    community: "Money Movement History",
    professional: "Account Ledger",
  },
  savingsStatement: {
    community: "Member Savings",
    professional: "Savings Statement",
  },
  savingsSummary: {
    community: "Fund Savings Summary",
    professional: "Savings Summary",
  },
  reversal: {
    community: "Correction",
    professional: "Reversal",
  },
  auditTrail: {
    community: "Activity History",
    professional: "Audit Trail",
  },
};

export function getTerm(term: DomainTerm, mode: ExperienceMode): string {
  const presentation = terminology[term];

  if (mode === "professional") {
    return presentation.professional;
  }

  return presentation.community;
}
const irregularPlurals: Partial<Record<DomainTerm, TermPresentation>> = {
  tenantUser: {
    community: "People",
    professional: "Tenant Users",
  },
  user: {
    community: "People",
    professional: "Users",
  },
  participant: {
    community: "Members",
    professional: "Cycle Participants",
  },
  accountingSettings: {
    community: "Money Tracking Setup",
    professional: "Accounting Settings",
  },
};

export function getTermPlural(term: DomainTerm, mode: ExperienceMode): string {
  const irregular = irregularPlurals[term];

  if (irregular) {
    return mode === "professional" ? irregular.professional : irregular.community;
  }

  return `${getTerm(term, mode)}s`;
}