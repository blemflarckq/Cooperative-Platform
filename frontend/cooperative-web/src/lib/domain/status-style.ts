export type StatusTone =
  | "success"
  | "info"
  | "neutral"
  | "warning"
  | "danger";

const statusToneMap: Record<string, StatusTone> = {
  ACTIVE: "success",
  OPEN: "success",

  POSTED: "info",
  CLOSED: "info",
  EXITED: "info",

  DRAFT: "neutral",
  PENDING: "neutral",

  PAUSED: "warning",
  SUSPENDED: "warning",

  CANCELLED: "danger",
  ARCHIVED: "danger",
  REVERSED: "danger",
  REMOVED: "danger",
  INACTIVE: "danger",
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