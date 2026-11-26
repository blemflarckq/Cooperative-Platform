import type { ExperienceMode } from "@/lib/experience/experience-mode";
import type { SchemeModeField } from "../types/scheme.types";

export interface ModeOption {
  label: string;
  description: string;
}

export const MODE_FIELDS: SchemeModeField[] = [
  "cycleMode",
  "contributionMode",
  "loanMode",
  "payoutMode",
];

/** The name of each rule. Community says what it decides; professional uses the system's own term. */
export function getModeHeading(mode: ExperienceMode, field: SchemeModeField): string {
  if (mode === "professional") {
    return {
      cycleMode: "Cycle mode",
      contributionMode: "Contribution mode",
      loanMode: "Loan mode",
      payoutMode: "Payout mode",
    }[field];
  }

  return {
    cycleMode: "How long it runs",
    contributionMode: "How people contribute",
    loanMode: "Loans",
    payoutMode: "What happens to the money",
  }[field];
}

const professional: Record<SchemeModeField, Record<string, ModeOption>> = {
  cycleMode: {
    FIXED_PERIOD: { label: "Fixed period", description: "Runs for a defined start and end." },
    OPEN_ENDED: { label: "Open ended", description: "Continues until it is stopped." },
    PROJECT_BASED: { label: "Project based", description: "Linked to a project or a target." },
  },
  contributionMode: {
    MONTHLY_FIXED: { label: "Monthly fixed", description: "Members contribute a fixed amount each month." },
    EVENT_TRIGGERED: { label: "Event triggered", description: "Contributions are requested when an event happens." },
    VOLUNTARY: { label: "Voluntary", description: "Members contribute when they can." },
    PROJECT_TARGET: { label: "Project target", description: "Contributions are collected toward a target." },
  },
  loanMode: {
    DISABLED: { label: "Disabled", description: "Loans are not offered." },
    SELF_BACKED: { label: "Self-backed", description: "Loans are backed by the member's own savings." },
    PEER_FUNDED: { label: "Peer-funded", description: "Loans are backed by pledges from other members." },
    SELF_AND_PEER_FUNDED: {
      label: "Self- and peer-funded",
      description: "Loans use the member's own savings first, then pledges from others.",
    },
  },
  payoutMode: {
    END_OF_CYCLE: { label: "End of cycle", description: "Money is shared out when the cycle ends." },
    NO_PAYOUT: { label: "No payout", description: "Money stays in the fund." },
    EVENT_BENEFICIARY: { label: "Event beneficiary", description: "Money is paid to a beneficiary when an event occurs." },
    PROJECT_EXPENSE: { label: "Project expense", description: "Money is spent on project costs." },
  },
};

const community: Record<SchemeModeField, Record<string, ModeOption>> = {
  cycleMode: {
    FIXED_PERIOD: {
      label: "Runs for a set time",
      description: "Good for yearly savings groups and fixed membership periods.",
    },
    OPEN_ENDED: {
      label: "Keeps going",
      description: "Good for burial societies, welfare funds and long-running groups.",
    },
    PROJECT_BASED: {
      label: "Tied to a project",
      description: "Good when you're collecting for one specific goal.",
    },
  },
  contributionMode: {
    MONTHLY_FIXED: {
      label: "Same amount every month",
      description: "Good for savings clubs and regular membership contributions.",
    },
    EVENT_TRIGGERED: {
      label: "Collected when needed",
      description: "Good for welfare, emergencies and funerals.",
    },
    VOLUNTARY: {
      label: "Members give when they can",
      description: "Good for church funds, donations and flexible giving.",
    },
    PROJECT_TARGET: {
      label: "Collected toward a target",
      description: "Good for buildings, equipment, trips and development projects.",
    },
  },
  loanMode: {
    DISABLED: { label: "No loans", description: "The fund only collects and keeps track of money." },
    SELF_BACKED: {
      label: "Borrow from your own savings",
      description: "Members can borrow up to what they have saved.",
    },
    PEER_FUNDED: {
      label: "Borrow with the group's backing",
      description: "Other members pledge money behind each loan.",
    },
    SELF_AND_PEER_FUNDED: {
      label: "Own savings plus the group's backing",
      description: "A loan uses the member's savings first, then pledges from others.",
    },
  },
  payoutMode: {
    END_OF_CYCLE: {
      label: "Shared out at the end",
      description: "Good for savings clubs where members get their money later.",
    },
    NO_PAYOUT: { label: "Stays in the fund", description: "Good when the fund keeps its money for the long term." },
    EVENT_BENEFICIARY: {
      label: "Paid to the person or family affected",
      description: "Good for burial, welfare and emergency support.",
    },
    PROJECT_EXPENSE: {
      label: "Paid toward project costs",
      description: "Good for building, equipment, transport and development.",
    },
  },
};

export function getModeOptions(
  mode: ExperienceMode,
  field: SchemeModeField,
): Record<string, ModeOption> {
  return (mode === "professional" ? professional : community)[field];
}

export function getModeOption(
  mode: ExperienceMode,
  field: SchemeModeField,
  value: string | undefined,
): ModeOption | undefined {
  return value ? getModeOptions(mode, field)[value] : undefined;
}

/** A one-line description of how a scheme runs, for list rows: "Runs for a set time · Same amount every month · No loans". */
export function summariseModes(
  mode: ExperienceMode,
  values: Partial<Record<SchemeModeField, string>>,
): string {
  return (["cycleMode", "contributionMode", "loanMode"] as const)
    .map((field) => getModeOption(mode, field, values[field])?.label)
    .filter(Boolean)
    .join(" · ");
}
