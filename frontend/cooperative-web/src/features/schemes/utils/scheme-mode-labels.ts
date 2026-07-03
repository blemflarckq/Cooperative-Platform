import { type ExperienceMode } from "@/lib/experience/experience-mode";

type LabelSet = {
  label: string;
  description?: string;
};

type ModeOptionLabels = Record<string, LabelSet>;

export function getCycleModeFieldLabel(mode: ExperienceMode): LabelSet {
  if (mode === "professional") {
    return {
      label: "Cycle Mode",
      description: "How this scheme is structured over time.",
    };
  }

  return {
    label: "When will this fund run?",
    description:
      "Choose whether this fund runs for a set period, stays open, or is linked to a project.",
  };
}

export function getContributionModeFieldLabel(mode: ExperienceMode): LabelSet {
  if (mode === "professional") {
    return {
      label: "Contribution Mode",
      description: "How contributions are expected from participants.",
    };
  }

  return {
    label: "How will people contribute?",
    description:
      "Choose whether members contribute monthly, when needed, voluntarily, or toward a target.",
  };
}

export function getLoanModeFieldLabel(mode: ExperienceMode): LabelSet {
  if (mode === "professional") {
    return {
      label: "Loan Mode",
      description: "Whether loans are enabled and how they are backed.",
    };
  }

  return {
    label: "Will this fund give loans?",
    description:
      "Choose whether members can borrow from this fund, or whether borrowing is disabled.",
  };
}

export function getPayoutModeFieldLabel(mode: ExperienceMode): LabelSet {
  if (mode === "professional") {
    return {
      label: "Payout Mode",
      description: "How money is eventually paid out or used.",
    };
  }

  return {
    label: "What happens to the money?",
    description:
      "Choose whether money is shared, paid to a beneficiary, spent on a project, or kept in the fund.",
  };
}

export function getCycleModeOptionLabels(
  mode: ExperienceMode,
): ModeOptionLabels {
  if (mode === "professional") {
    return {
      FIXED_PERIOD: {
        label: "Fixed Period",
        description: "Runs for a defined start and end period.",
      },
      OPEN_ENDED: {
        label: "Open Ended",
        description: "Continues until manually stopped.",
      },
      PROJECT_BASED: {
        label: "Project Based",
        description: "Linked to a project or target.",
      },
    };
  }

  return {
    FIXED_PERIOD: {
      label: "Runs for a set time",
      description: "Good for annual savings groups or fixed membership periods.",
    },
    OPEN_ENDED: {
      label: "Ongoing",
      description: "Good for burial societies, welfare funds, and long-running groups.",
    },
    PROJECT_BASED: {
      label: "Project-based",
      description: "Good when collecting money for a specific goal or project.",
    },
  };
}

export function getContributionModeOptionLabels(
  mode: ExperienceMode,
): ModeOptionLabels {
  if (mode === "professional") {
    return {
      MONTHLY_FIXED: {
        label: "Monthly Fixed",
        description: "Members contribute a fixed amount monthly.",
      },
      EVENT_TRIGGERED: {
        label: "Event Triggered",
        description: "Contributions are requested when an event happens.",
      },
      VOLUNTARY: {
        label: "Voluntary",
        description: "Members contribute when they can.",
      },
      PROJECT_TARGET: {
        label: "Project Target",
        description: "Contributions are collected toward a target.",
      },
    };
  }

  return {
    MONTHLY_FIXED: {
      label: "Same amount every month",
      description: "Good for savings clubs and regular membership contributions.",
    },
    EVENT_TRIGGERED: {
      label: "Collected when needed",
      description: "Good for welfare, emergencies, funerals, or support events.",
    },
    VOLUNTARY: {
      label: "Members give when they can",
      description: "Good for church funds, donations, or flexible giving.",
    },
    PROJECT_TARGET: {
      label: "Collected toward a target",
      description: "Good for development projects, equipment, trips, or building funds.",
    },
  };
}

export function getLoanModeOptionLabels(mode: ExperienceMode): ModeOptionLabels {
  if (mode === "professional") {
    return {
      DISABLED: {
        label: "Disabled",
        description: "Loans are not allowed.",
      },
      SELF_BACKED: {
        label: "Self-backed",
        description: "Loans are secured by the member's own savings.",
      },
      PEER_FUNDED: {
        label: "Peer-funded",
        description: "Loans are supported by group funds.",
      },
      SELF_AND_PEER_FUNDED: {
        label: "Self and Peer-funded",
        description: "Hybrid loan support model.",
      },
    };
  }

  return {
    DISABLED: {
      label: "No loans",
      description: "This fund will only collect and track money.",
    },
    SELF_BACKED: {
      label: "Borrow from own savings",
      description: "Members can borrow based on what they have saved.",
    },
    PEER_FUNDED: {
      label: "Borrow from group support",
      description: "Members can borrow from money supported by the group.",
    },
    SELF_AND_PEER_FUNDED: {
      label: "Own savings + group support",
      description: "Members can borrow using both personal savings and group support.",
    },
  };
}

export function getPayoutModeOptionLabels(
  mode: ExperienceMode,
): ModeOptionLabels {
  if (mode === "professional") {
    return {
      END_OF_CYCLE: {
        label: "End of Cycle",
        description: "Money is distributed when the cycle ends.",
      },
      NO_PAYOUT: {
        label: "No Payout",
        description: "Money is retained or tracked without distribution.",
      },
      EVENT_BENEFICIARY: {
        label: "Event Beneficiary",
        description: "Money is paid to a beneficiary when an event occurs.",
      },
      PROJECT_EXPENSE: {
        label: "Project Expense",
        description: "Money is spent on project costs.",
      },
    };
  }

  return {
    END_OF_CYCLE: {
      label: "Shared at the end",
      description: "Good for savings clubs where members receive money later.",
    },
    NO_PAYOUT: {
      label: "No payout",
      description: "Good when the fund keeps money for long-term use.",
    },
    EVENT_BENEFICIARY: {
      label: "Paid to affected person or family",
      description: "Good for burial, welfare, or emergency support funds.",
    },
    PROJECT_EXPENSE: {
      label: "Paid toward project costs",
      description: "Good for building, equipment, transport, or development projects.",
    },
  };
}