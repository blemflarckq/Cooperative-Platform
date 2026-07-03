import { type SchemeFormValues } from "../schemas/scheme.schema";

export interface FundRuleSummaryLine {
  id: string;
  text: string;
}

const cycleModeSummary: Record<string, string> = {
  FIXED_PERIOD: "Run for a set period",
  OPEN_ENDED: "Run continuously until stopped",
  PROJECT_BASED: "Run around a specific project or target",
};

const contributionModeSummary: Record<string, string> = {
  MONTHLY_FIXED: "Collect the same amount every month",
  EVENT_TRIGGERED: "Collect money when something happens",
  VOLUNTARY: "Allow people to give when they can",
  PROJECT_TARGET: "Collect money toward a target",
};

const loanModeSummary: Record<string, string> = {
  DISABLED: "Not give loans",
  SELF_BACKED: "Allow members to borrow from their own savings",
  PEER_FUNDED: "Allow borrowing supported by the group",
  SELF_AND_PEER_FUNDED: "Allow borrowing using own savings and group support",
};

const payoutModeSummary: Record<string, string> = {
  END_OF_CYCLE: "Share money at the end",
  NO_PAYOUT: "Keep money in the fund",
  EVENT_BENEFICIARY: "Pay money to affected people or families when needed",
  PROJECT_EXPENSE: "Pay toward project costs",
};

export function getFundRuleSummary(
  values: Partial<SchemeFormValues>,
): FundRuleSummaryLine[] {
  return [
    {
      id: "cycleMode",
      text:
        cycleModeSummary[values.cycleMode ?? ""] ??
        "Choose when this fund will run",
    },
    {
      id: "contributionMode",
      text:
        contributionModeSummary[values.contributionMode ?? ""] ??
        "Choose how people will contribute",
    },
    {
      id: "loanMode",
      text:
        loanModeSummary[values.loanMode ?? ""] ??
        "Choose whether this fund will give loans",
    },
    {
      id: "payoutMode",
      text:
        payoutModeSummary[values.payoutMode ?? ""] ??
        "Choose what happens to the money",
    },
  ];
}