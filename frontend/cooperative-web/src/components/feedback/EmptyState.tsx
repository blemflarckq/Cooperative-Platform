import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        {icon ? (
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--primary)]">
            {icon}
          </div>
        ) : null}

        <h3 className="text-base font-semibold text-[var(--foreground)]">
          {title}
        </h3>

        {description ? (
          <p className="mt-2 max-w-md text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}

        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}