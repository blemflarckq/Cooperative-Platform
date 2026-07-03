import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { cn } from "@/lib/utils/cn";
import { type SetupChecklist } from "../types/setup-checklist.types";

interface SetupChecklistCardProps {
  checklist: SetupChecklist;
}

export function SetupChecklistCard({ checklist }: SetupChecklistCardProps) {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  function goTo(path?: string) {
    if (!path) return;
    navigate(appPath(path));
  }

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Community Fund Setup</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Complete these steps to get your group ready for real use.
            </p>
          </div>

          <ReadinessPill status={checklist.readinessStatus}>
            {checklist.readinessTitle}
          </ReadinessPill>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div
          className={cn(
            "rounded-2xl border p-4",
            checklist.readinessStatus === "ready"
              ? "border-emerald-200 bg-emerald-50"
              : checklist.readinessStatus === "almost_ready"
                ? "border-blue-200 bg-blue-50"
                : checklist.readinessStatus === "getting_there"
                  ? "border-amber-200 bg-amber-50"
                  : "border-slate-200 bg-slate-50",
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {checklist.progressPercentage}% Ready
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {checklist.readinessMessage}
              </p>
            </div>

            {checklist.nextIncompleteStep ? (
              <Button
                type="button"
                onClick={() => goTo(checklist.nextIncompleteStep?.href)}
              >
                Continue Setup
                <ArrowRight className="ml-2 size-4" />
              </Button>
            ) : null}
          </div>

          <div className="mt-4">
            <Progress value={checklist.progressPercentage} />
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {checklist.completedCount} of {checklist.totalCount} steps completed
            </p>
          </div>
        </div>

        {checklist.nextIncompleteStep ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Next recommended action
            </p>
            <p className="mt-1 font-semibold text-[var(--foreground)]">
              {checklist.nextIncompleteStep.title}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {checklist.nextIncompleteStep.description}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          {checklist.items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={!item.href}
              onClick={() => goTo(item.href)}
              className={cn(
                "flex w-full items-start justify-between gap-4 rounded-2xl border border-[var(--border)] p-4 text-left transition",
                item.completed
                  ? "bg-[var(--secondary)]"
                  : "bg-[var(--background)] hover:bg-[var(--secondary)]",
              )}
            >
              <div className="flex gap-3">
                {item.completed ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 size-5 shrink-0 text-[var(--muted-foreground)]" />
                )}

                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {item.description}
                  </p>
                </div>
              </div>

              {!item.completed && item.href ? (
                <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--muted-foreground)]" />
              ) : null}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessPill({
  status,
  children,
}: {
  status: SetupChecklist["readinessStatus"];
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
        status === "ready" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "almost_ready" &&
          "border-blue-200 bg-blue-50 text-blue-700",
        status === "getting_there" &&
          "border-amber-200 bg-amber-50 text-amber-700",
        status === "not_ready" &&
          "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {children}
    </span>
  );
}