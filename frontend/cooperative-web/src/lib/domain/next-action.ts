export type NextActionKind =
  | "create_scheme"
  | "activate_scheme"
  | "create_cycle"
  | "open_cycle"
  | "add_members"
  | "record_contribution"
  | "view_savings_summary"
  | "review_reports"
  | "none";

export interface NextAction {
  kind: NextActionKind;
  title: string;
  description: string;
  actionLabel: string;
  to?: string;
  priority: "high" | "medium" | "low";
}

interface ResolveSchemeNextActionInput {
  schemeId: string;
  schemeStatus: string;
  cycleCount: number;
  latestCycleId?: string;
  latestCycleStatus?: string;
  participantCount?: number;
  contributionCount?: number;
  isCommunityMode: boolean;
}

export function resolveSchemeNextAction({
  schemeId,
  schemeStatus,
  cycleCount,
  latestCycleId,
  latestCycleStatus,
  participantCount,
  contributionCount,
  isCommunityMode,
}: ResolveSchemeNextActionInput): NextAction {
  if (schemeStatus !== "ACTIVE") {
    return {
      kind: "activate_scheme",
      title: isCommunityMode
        ? "Start using this group fund"
        : "Activate this scheme",
      description: isCommunityMode
        ? "This group fund is not active yet. Activate it before creating activity periods and recording money."
        : "This scheme must be active before operating cycles can be used.",
      actionLabel: isCommunityMode ? "Activate Group Fund" : "Activate Scheme",
      priority: "high",
    };
  }

  if (cycleCount === 0) {
    return {
      kind: "create_cycle",
      title: isCommunityMode
        ? "Create the first activity period"
        : "Create the first operating cycle",
      description: isCommunityMode
        ? "An activity period lets you add members and start recording money."
        : "An operating cycle is required before participants and contributions can be managed.",
      actionLabel: isCommunityMode
        ? "Create Activity Period"
        : "Create Operating Cycle",
      to: `/schemes/${schemeId}/cycles/new`,
      priority: "high",
    };
  }

  if (latestCycleId && latestCycleStatus !== "OPEN") {
    return {
      kind: "open_cycle",
      title: isCommunityMode
        ? "Open the activity period"
        : "Open the operating cycle",
      description: isCommunityMode
        ? "Open the activity period when the group is ready to add members and record money."
        : "Open the operating cycle before posting contributions.",
      actionLabel: isCommunityMode
        ? "Open Activity Period"
        : "Open Operating Cycle",
      to: `/cycles/${latestCycleId}`,
      priority: "high",
    };
  }

  if (
    latestCycleId &&
    typeof participantCount === "number" &&
    participantCount === 0
  ) {
    return {
      kind: "add_members",
      title: isCommunityMode ? "Add members" : "Add participants",
      description: isCommunityMode
        ? "Add the people who are part of this activity period before recording money."
        : "Enroll participants into this operating cycle before posting contributions.",
      actionLabel: isCommunityMode ? "Add Members" : "Add Participants",
      to: `/cycles/${latestCycleId}/participants/new`,
      priority: "high",
    };
  }

  if (
    latestCycleId &&
    typeof contributionCount === "number" &&
    contributionCount === 0
  ) {
    return {
      kind: "record_contribution",
      title: isCommunityMode
        ? "Record the first money received"
        : "Post the first contribution",
      description: isCommunityMode
        ? "Once members have been added, record money received from them."
        : "Once participants have been enrolled, post contributions against the cycle.",
      actionLabel: isCommunityMode
        ? "Record Money Received"
        : "Post Contribution",
      to: `/cycles/${latestCycleId}/contributions/new`,
      priority: "high",
    };
  }

  if (latestCycleId) {
    return {
      kind: "view_savings_summary",
      title: isCommunityMode
        ? "Continue with the latest activity period"
        : "Review the latest operating cycle",
      description: isCommunityMode
        ? "Open the latest activity period to manage members, money received, and savings."
        : "Open the latest operating cycle to review participants, contributions, and savings reports.",
      actionLabel: isCommunityMode
        ? "Open Activity Period"
        : "Open Operating Cycle",
      to: `/cycles/${latestCycleId}`,
      priority: "medium",
    };
  }

  return {
    kind: "none",
    title: isCommunityMode ? "Nothing urgent" : "No next action",
    description: isCommunityMode
      ? "There is no urgent action needed right now."
      : "No recommended next action is available.",
    actionLabel: "View Details",
    to: `/schemes/${schemeId}`,
    priority: "low",
  };
}

interface ResolveCycleNextActionInput {
  cycleId: string;
  cycleStatus: string;
  participantCount?: number;
  contributionCount?: number;
  isCommunityMode: boolean;
}

export function resolveCycleNextAction({
  cycleId,
  cycleStatus,
  participantCount,
  contributionCount,
  isCommunityMode,
}: ResolveCycleNextActionInput): NextAction {
  if (cycleStatus === "DRAFT") {
    return {
      kind: "open_cycle",
      title: isCommunityMode
        ? "Start collecting money"
        : "Open this operating cycle",
      description: isCommunityMode
        ? "Open this activity period when the group is ready to add members and record money received."
        : "Open this operating cycle before enrolling participants and posting contributions.",
      actionLabel: isCommunityMode ? "Start Collecting" : "Open Cycle",
      priority: "high",
    };
  }

  if (cycleStatus === "PAUSED") {
    return {
      kind: "open_cycle",
      title: isCommunityMode
        ? "Resume this activity period"
        : "Resume this operating cycle",
      description: isCommunityMode
        ? "This activity period is paused. Resume it when the group is ready to continue."
        : "This operating cycle is paused. Re-open it to continue operational activity.",
      actionLabel: isCommunityMode ? "Resume Collecting" : "Re-open Cycle",
      priority: "high",
    };
  }

  if (cycleStatus === "CANCELLED") {
    return {
      kind: "none",
      title: isCommunityMode
        ? "This activity period was cancelled"
        : "This cycle was cancelled",
      description: isCommunityMode
        ? "No further money or members should be added to this cancelled activity period."
        : "No further operational activity should be posted to this cancelled cycle.",
      actionLabel: "View Details",
      priority: "low",
    };
  }

  if (cycleStatus === "CLOSED") {
    return {
      kind: "review_reports",
      title: isCommunityMode
        ? "Review the final savings summary"
        : "Review final cycle reports",
      description: isCommunityMode
        ? "This activity period is complete. Review the savings summary and member savings records."
        : "This operating cycle is closed. Review contributions, reversals, and accounting reports.",
      actionLabel: isCommunityMode ? "View Savings Summary" : "View Reports",
      to: `/cycles/${cycleId}`,
      priority: "medium",
    };
  }

  if (
    cycleStatus === "OPEN" &&
    typeof participantCount === "number" &&
    participantCount === 0
  ) {
    return {
      kind: "add_members",
      title: isCommunityMode ? "Add members" : "Add participants",
      description: isCommunityMode
        ? "Add the people who are part of this activity period before recording money."
        : "Enroll participants before posting contributions.",
      actionLabel: isCommunityMode ? "Add Members" : "Add Participants",
      to: `/cycles/${cycleId}/participants/new`,
      priority: "high",
    };
  }

  if (
    cycleStatus === "OPEN" &&
    typeof contributionCount === "number" &&
    contributionCount === 0
  ) {
    return {
      kind: "record_contribution",
      title: isCommunityMode
        ? "Record the first money received"
        : "Post the first contribution",
      description: isCommunityMode
        ? "Members have been added. You can now record money received from them."
        : "Participants have been enrolled. You can now post contributions.",
      actionLabel: isCommunityMode
        ? "Record Money Received"
        : "Post Contribution",
      to: `/cycles/${cycleId}/contributions/new`,
      priority: "high",
    };
  }

  if (cycleStatus === "OPEN") {
    return {
      kind: "view_savings_summary",
      title: isCommunityMode
        ? "Review fund progress"
        : "Review cycle progress",
      description: isCommunityMode
        ? "Check members, money received, corrections, and the savings summary."
        : "Review participants, contributions, reversals, and savings reports.",
      actionLabel: isCommunityMode ? "View Savings Summary" : "View Reports",
      to: `/cycles/${cycleId}`,
      priority: "medium",
    };
  }

  return {
    kind: "none",
    title: isCommunityMode ? "Nothing urgent" : "No next action",
    description: isCommunityMode
      ? "There is no urgent action needed right now."
      : "No recommended next action is available.",
    actionLabel: "View Details",
    to: `/cycles/${cycleId}`,
    priority: "low",
  };
}

interface ResolveDashboardNextActionInput {
  schemeCount: number;
  isCommunityMode: boolean;
}

export function resolveDashboardNextAction({
  schemeCount,
  isCommunityMode,
}: ResolveDashboardNextActionInput): NextAction {
  if (schemeCount === 0) {
    return {
      kind: "create_scheme",
      title: isCommunityMode
        ? "Create your first group fund"
        : "Create your first scheme",
      description: isCommunityMode
        ? "Start by setting up a savings club, burial society, project fund, church fund, or community fund."
        : "Start by creating a scheme that defines the operating rules for cycles, participants, contributions, loans, and payouts.",
      actionLabel: isCommunityMode ? "Create Group Fund" : "Create Scheme",
      to: "/schemes/new",
      priority: "high",
    };
  }

  return {
    kind: "review_reports",
    title: isCommunityMode
      ? "Continue managing group funds"
      : "Continue managing schemes",
    description: isCommunityMode
      ? "Open your group funds to manage activity periods, members, money received, and savings summaries."
      : "Open schemes to manage operating cycles, participants, contributions, and accounting reports.",
    actionLabel: isCommunityMode ? "View Group Funds" : "View Schemes",
    to: "/schemes",
    priority: "medium",
  };
}