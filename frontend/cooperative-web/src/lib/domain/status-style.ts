export type StatusTone =
  | "success"
  | "info"
  | "neutral"
  | "warning"
  | "danger";

const statusToneMap: Record<string, StatusTone> = {
  ACTIVE: "success",
  OPEN: "success",
  APPROVED: "success",
  REPAID: "success",
  ALLOCATED: "success",

  POSTED: "info",
  CLOSED: "info",
  EXITED: "info",
  EXECUTED: "info",

  DRAFT: "neutral",
  PENDING: "neutral",

  PAUSED: "warning",
  SUSPENDED: "warning",
  PENDING_PLEDGES: "warning",
  PENDING_APPROVAL: "warning",
  INITIATED: "warning",
  UNALLOCATED: "warning",

  CANCELLED: "danger",
  ARCHIVED: "danger",
  REVERSED: "danger",
  REMOVED: "danger",
  INACTIVE: "danger",
  AT_RISK: "danger",
  REJECTED: "danger",

  // Derived, frontend-only state — not a real backend status, computed
  // when a loan's status is PENDING_APPROVAL but its outbound request has
  // actually reached APPROVED. This is the specific fix for "stays as
  // awaiting approval" — the decision genuinely is complete, so it reads
  // as success, distinct from still-waiting PENDING_APPROVAL above.
  LOAN_READY_TO_DISBURSE: "success",
};

export function getStatusTone(status?: string | null): StatusTone {
  if (!status) return "neutral";
  return statusToneMap[status] ?? "neutral";
}

export function getStatusToneClass(tone: StatusTone): string {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "info":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "danger":
      return "border-red-200 bg-red-50 text-red-700";
    case "neutral":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}