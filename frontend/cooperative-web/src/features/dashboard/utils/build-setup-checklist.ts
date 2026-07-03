import { type SetupChecklist } from "../types/setup-checklist.types";

interface BuildSetupChecklistInput {
  hasScheme: boolean;
  hasActiveCycle: boolean;
  hasParticipants: boolean;
  accountingConfigured: boolean;
  hasContributions: boolean;
}

function getReadinessPresentation(completedCount: number, totalCount: number) {
  if (completedCount === totalCount) {
    return {
      readinessStatus: "ready" as const,
      readinessTitle: "Ready To Use",
      readinessMessage:
        "Your community fund is fully configured and ready for day-to-day use.",
    };
  }

  if (completedCount >= totalCount - 1) {
    return {
      readinessStatus: "almost_ready" as const,
      readinessTitle: "Almost Ready",
      readinessMessage:
        "You are one step away from being ready to run this fund confidently.",
    };
  }

  if (completedCount >= 2) {
    return {
      readinessStatus: "getting_there" as const,
      readinessTitle: "Getting There",
      readinessMessage:
        "The foundation is coming together. Complete the next steps to start operating smoothly.",
    };
  }

  return {
    readinessStatus: "not_ready" as const,
    readinessTitle: "Not Ready Yet",
    readinessMessage:
      "Start with the basics below so your group can collect and track money safely.",
  };
}

export function buildSetupChecklist(
  input: BuildSetupChecklistInput,
): SetupChecklist {
  const items = [
    {
      id: "create-fund",
      title: "Create your first group fund",
      description: "Choose what your group is collecting or saving for.",
      completed: input.hasScheme,
      href: "/schemes/new",
    },
    {
      id: "start-cycle",
      title: "Start an operating cycle",
      description:
        "Open the period or project phase where money will be tracked.",
      completed: input.hasActiveCycle,
      href: "/schemes",
    },
    {
      id: "add-people",
      title: "Add people",
      description: "Invite or add the members who will participate.",
      completed: input.hasParticipants,
      href: "/members",
    },
    {
      id: "setup-money-tracking",
      title: "Set up money tracking",
      description: "Confirm where money is held and how savings are tracked.",
      completed: input.accountingConfigured,
      href: "/accounting/settings",
    },
    {
      id: "record-money",
      title: "Record money received",
      description: "Capture the first contribution or collection.",
      completed: input.hasContributions,
      href: "/schemes",
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  return {
    ...getReadinessPresentation(completedCount, totalCount),
    items,
    completedCount,
    totalCount,
    progressPercentage,
    nextIncompleteStep: items.find((item) => !item.completed),
  };
}