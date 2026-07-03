import type {
  ContributionMode,
  CycleMode,
  LoanMode,
  PayoutMode,
} from "./scheme.types";

export type FundTemplateId =
  | "savings_club"
  | "burial_society"
  | "community_project"
  | "church_fund"
  | "sports_club"
  | "welfare_fund"
  | "investment_group"
  | "cooperative"
  | "custom";

export interface FundTemplate {
  id: FundTemplateId;
  title: string;
  description: string;
  recommendedFor: string;
  defaults: {
    cycleMode?: CycleMode;
    contributionMode?: ContributionMode;
    loanMode?: LoanMode;
    payoutMode?: PayoutMode;
  };
}