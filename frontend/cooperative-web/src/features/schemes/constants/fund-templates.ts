import { type FundTemplate } from "../types/fund-template.types";

export const FUND_TEMPLATES: FundTemplate[] = [
  {
    id: "savings_club",
    title: "Savings Club",
    description:
      "Members save together over a period and may share money at the end.",
    recommendedFor:
      "Village savings groups, workplace savings clubs, family savings groups.",
    defaults: {
      cycleMode: "FIXED_PERIOD",
      contributionMode: "MONTHLY_FIXED",
      loanMode: "SELF_BACKED",
      payoutMode: "END_OF_CYCLE",
    },
  },
  {
    id: "burial_society",
    title: "Burial Society",
    description:
      "Members contribute so the group can support families during bereavement.",
    recommendedFor:
      "Burial societies, family support groups, welfare associations.",
    defaults: {
      cycleMode: "OPEN_ENDED",
      contributionMode: "MONTHLY_FIXED",
      loanMode: "DISABLED",
      payoutMode: "EVENT_BENEFICIARY",
    },
  },
  {
    id: "community_project",
    title: "Community Project",
    description:
      "People collect money toward a shared development goal or project.",
    recommendedFor:
      "Water projects, halls, roads, school projects, local development efforts.",
    defaults: {
      cycleMode: "PROJECT_BASED",
      contributionMode: "PROJECT_TARGET",
      loanMode: "DISABLED",
      payoutMode: "PROJECT_EXPENSE",
    },
  },
  {
    id: "church_fund",
    title: "Church Fund",
    description:
      "Track church collections, member giving, and development contributions.",
    recommendedFor:
      "Church building funds, ministry collections, congregation projects.",
    defaults: {
      cycleMode: "OPEN_ENDED",
      contributionMode: "VOLUNTARY",
      loanMode: "DISABLED",
      payoutMode: "PROJECT_EXPENSE",
    },
  },
  {
    id: "sports_club",
    title: "Sports Club Fund",
    description:
      "Collect money for equipment, transport, events, and team activities.",
    recommendedFor:
      "Football clubs, school teams, community sports groups.",
    defaults: {
      cycleMode: "PROJECT_BASED",
      contributionMode: "PROJECT_TARGET",
      loanMode: "DISABLED",
      payoutMode: "PROJECT_EXPENSE",
    },
  },
  {
    id: "welfare_fund",
    title: "Welfare Fund",
    description:
      "Members contribute to support emergencies and welfare needs.",
    recommendedFor:
      "Workplace welfare groups, community emergency funds, mutual aid groups.",
    defaults: {
      cycleMode: "OPEN_ENDED",
      contributionMode: "EVENT_TRIGGERED",
      loanMode: "DISABLED",
      payoutMode: "EVENT_BENEFICIARY",
    },
  },
  {
    id: "investment_group",
    title: "Investment Group",
    description:
      "Members pool money for shared investment activity and long-term growth.",
    recommendedFor:
      "Investment clubs, family investment groups, business pooling groups.",
    defaults: {
      cycleMode: "OPEN_ENDED",
      contributionMode: "MONTHLY_FIXED",
      loanMode: "DISABLED",
      payoutMode: "NO_PAYOUT",
    },
  },
  {
    id: "cooperative",
    title: "Cooperative",
    description:
      "A more formal savings and credit model with stronger financial controls.",
    recommendedFor:
      "Registered cooperatives, SACCO-like groups, formal member societies.",
    defaults: {
      cycleMode: "OPEN_ENDED",
      contributionMode: "MONTHLY_FIXED",
      loanMode: "SELF_AND_PEER_FUNDED",
      payoutMode: "END_OF_CYCLE",
    },
  },
  {
    id: "custom",
    title: "Custom Fund",
    description:
      "Start from a blank setup and choose the rules yourself.",
    recommendedFor:
      "Groups with special rules or advanced configuration needs.",
    defaults: {},
  },
];