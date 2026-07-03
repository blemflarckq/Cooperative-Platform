export type ReadinessStatus = "not_ready" | "getting_there" | "almost_ready" | "ready";

export interface SetupChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href?: string;
}

export interface SetupChecklist {
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  readinessStatus: ReadinessStatus;
  readinessTitle: string;
  readinessMessage: string;
  nextIncompleteStep?: SetupChecklistItem;
  items: SetupChecklistItem[];
}