import { Badge } from "@/components/ui/badge";
import { getStatusToneClass, type StatusTone } from "@/lib/domain/status-style";
import { cn } from "@/lib/utils/cn";
import type { SchemeStatus } from "../types/scheme.types";

/**
 * One set of words for a scheme's state, whichever wording mode is on —
 * the same words the server's messages use, so what the badge says and
 * what an error says never disagree. (The shared badge calls these
 * "Ready to use" and "Temporarily stopped", and shows archived in red.)
 */
const PRESENTATION: Record<SchemeStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "success" },
  SUSPENDED: { label: "Suspended", tone: "warning" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export function SchemeStatusBadge({ status }: { status: SchemeStatus }) {
  const { label, tone } = PRESENTATION[status];
  return (
    <Badge variant="outline" className={cn("shrink-0", getStatusToneClass(tone))}>
      {label}
    </Badge>
  );
}
