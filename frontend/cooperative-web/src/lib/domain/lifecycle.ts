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