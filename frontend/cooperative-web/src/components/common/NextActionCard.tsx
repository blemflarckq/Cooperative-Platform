import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import type { NextAction } from "@/lib/domain/next-action";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { cn } from "@/lib/utils/cn";

interface NextActionCardProps {
  action: NextAction;
  className?: string;
  onAction?: () => void;
  disabled?: boolean;
}

export function NextActionCard({
  action,
  className,
  onAction,
  disabled,
}: NextActionCardProps) {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  const priorityClass =
    action.priority === "high"
      ? "border-emerald-200 bg-emerald-50"
      : "border-[var(--border)] bg-[var(--card)]";

  function handleClick() {
    if (onAction) {
      onAction();
      return;
    }

    if (action.to) {
      navigate(appPath(action.to));
    }
  }

  return (
    <div className={cn("rounded-2xl border p-4", priorityClass, className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)]">
            <Sparkles className="size-5" />
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Suggested next step
            </p>

            <h3 className="mt-1 text-base font-bold text-[var(--foreground)]">
              {action.title}
            </h3>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {action.description}
            </p>
          </div>
        </div>

        {action.to || onAction ? (
          <Button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className="shrink-0"
          >
            {action.actionLabel}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}