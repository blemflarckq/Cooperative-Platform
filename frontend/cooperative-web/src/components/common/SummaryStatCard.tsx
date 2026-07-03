import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface SummaryStatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}

export function SummaryStatCard({
  label,
  value,
  hint,
  icon,
}: SummaryStatCardProps) {
  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)]">
              {value}
            </p>
            {hint ? (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {hint}
              </p>
            ) : null}
          </div>

          {icon ? <div className="text-[var(--primary)]">{icon}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}