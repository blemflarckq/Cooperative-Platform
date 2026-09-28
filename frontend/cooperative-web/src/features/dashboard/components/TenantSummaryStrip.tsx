import { Users, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TenantSummaryStripProps {
  activeMemberCount: number;
  activeSchemeCount: number;
}

/**
 * Both the admin and member dashboards show the same two tenant-wide
 * counts — extracted once both needed it, matching the same dedup
 * discipline already applied to the backend queries behind these
 * numbers, rather than building this a second time as its own copy.
 */
export function TenantSummaryStrip({
  activeMemberCount,
  activeSchemeCount,
}: TenantSummaryStripProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Card className="rounded-lg border-0 bg-[var(--secondary)] p-3.5 shadow-none ring-0">
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-[var(--muted-foreground)]" />
          <span className="text-xl font-medium">{activeMemberCount}</span>
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">active members</div>
      </Card>
      <Card className="rounded-lg border-0 bg-[var(--secondary)] p-3.5 shadow-none ring-0">
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5 text-[var(--muted-foreground)]" />
          <span className="text-xl font-medium">{activeSchemeCount}</span>
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">active schemes</div>
      </Card>
    </div>
  );
}
