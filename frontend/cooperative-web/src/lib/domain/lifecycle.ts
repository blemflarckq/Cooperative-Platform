export interface LifecyclePresentation {
  label: string;
  description?: string;
}

const lifecycleMap: Record<string, LifecyclePresentation> = {
  // Schemes
  DRAFT: {
    label: "Being Set Up",
    description: "This fund is still being configured.",
  },

  ACTIVE: {
    label: "Ready To Use",
    description: "This fund is active and can be used.",
  },

  SUSPENDED: {
    label: "Temporarily Stopped",
    description: "Activities are temporarily paused.",
  },

  ARCHIVED: {
    label: "Closed",
    description: "This fund has been closed and kept for history.",
  },

  // Cycles
  OPEN: {
    label: "Collecting Money",
    description: "Members can contribute and participate.",
  },

  PAUSED: {
    label: "Temporarily Paused",
    description: "This cycle has been paused.",
  },

  CLOSED: {
    label: "Completed",
    description: "This cycle has been completed.",
  },

  CANCELLED: {
    label: "Cancelled",
    description: "This cycle was cancelled before completion.",
  },

  // Participants
  EXITED: {
    label: "Left Group",
    description: "Participant voluntarily left.",
  },

  REMOVED: {
    label: "Removed",
    description: "Participant was removed.",
  },

  // Accounting
  POSTED: {
    label: "Recorded",
    description: "Transaction successfully recorded.",
  },

  REVERSED: {
    label: "Reversed",
    description: "Transaction was reversed.",
  },

  PENDING: {
    label: "Pending",
    description: "Awaiting completion.",
  },

  // Loans
  PENDING_PLEDGES: {
    label: "Waiting for your group",
    description: "This loan needs members to pledge before it can be approved.",
  },

  PENDING_APPROVAL: {
    label: "Waiting on approval",
    description: "This loan is waiting on the required approvals.",
  },

  AT_RISK: {
    label: "Needs attention",
    description: "This loan's peer-funded rate reached its cap.",
  },

  REPAID: {
    label: "Fully repaid",
    description: "This loan has been fully paid back.",
  },

  LOAN_READY_TO_DISBURSE: {
    label: "Approved, ready to send",
    description: "Both approvals are in — the funds can now be disbursed.",
  },

  // Outbound requests (approvals)
  INITIATED: {
    label: "Waiting on approval",
    description: "This request is waiting on the required approvals.",
  },

  APPROVED: {
    label: "Approved",
    description: "This request has been fully approved.",
  },

  REJECTED: {
    label: "Declined",
    description: "This request was declined.",
  },

  EXECUTED: {
    label: "Completed",
    description: "This request has been carried out.",
  },

  // Payment allocation
  UNALLOCATED: {
    label: "Waiting for you to allocate",
    description: "This payment has been recorded but not yet applied to anything.",
  },

  ALLOCATED: {
    label: "Allocated",
    description: "This payment has been applied.",
  },
};

export function getLifecyclePresentation(
  status?: string | null,
): LifecyclePresentation {
  if (!status) {
    return {
      label: "Unknown",
    };
  }

  return (
    lifecycleMap[status] ?? {
      label: status.replaceAll("_", " "),
    }
  );
}