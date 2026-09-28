import { Flame, Clock, AlertCircle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { useMemberDashboard } from "../hooks/useMemberDashboard";
import { TenantSummaryStrip } from "../components/TenantSummaryStrip";
import type { SchemeLeadMeasure, PersonalActionItem } from "../types/member-dashboard.types";

/**
 * Replaces the old DashboardPage entirely — that page's whole job
 * (a setup checklist, "what scheme have you made yet") belonged to
 * onboarding, which the Setup wizard now genuinely handles. This page
 * is what's left once that job is removed: an ongoing view of what a
 * member's actually part of.
 *
 * Each scheme renders a different lead measure depending on what's
 * actually true for it — a streak or a progress bar would be a
 * fabricated number for a scheme with no real cadence or target, so
 * VOLUNTARY and EVENT_TRIGGERED schemes get an honestly different
 * treatment instead of being forced into one of the other two.
 */
export function MemberDashboardPage() {
  const { user } = useAuth();
  const { navigateToApp } = useTenantNavigation();
  const dashboardQuery = useMemberDashboard();

  if (dashboardQuery.isLoading) return <LoadingState />;
  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <ErrorState title="Could not load your dashboard" />;
  }

  const data = dashboardQuery.data;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <div>
        <div className="text-xs text-[var(--muted-foreground)]">Welcome back</div>
        <h1 className="text-lg font-semibold">{user?.fullName ?? "there"}</h1>
      </div>

      <div>
        <div className="mb-2 text-xs text-[var(--muted-foreground)]">Your schemes</div>
        {data.schemes.length === 0 ? (
          <EmptyState
            title="Not part of a scheme yet"
            description="Once you join one, its progress will show up here."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {data.schemes.map((scheme) => (
              <SchemeLeadMeasureCard
                key={scheme.schemeId}
                scheme={scheme}
                onClick={() => navigateToApp(`/schemes/${scheme.schemeId}`)}
              />
            ))}
          </div>
        )}
      </div>

      {data.actionItems.length > 0 && (
        <div>
          <div className="mb-2 text-xs text-[var(--muted-foreground)]">Needs your attention</div>
          <div className="flex flex-col gap-2">
            {data.actionItems.map((item) => (
              <ActionItemCard
                key={`${item.type}-${item.relatedId}`}
                item={item}
                onClick={() =>
                  navigateToApp(
                    item.type === "unallocated_payment"
                      ? `/allocate-payment/${item.relatedId}`
                      : `/loans/${item.relatedId}`,
                  )
                }
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs text-[var(--muted-foreground)]">Your cooperative</div>
        <TenantSummaryStrip
          activeMemberCount={data.tenantSummary.activeMemberCount}
          activeSchemeCount={data.tenantSummary.activeSchemeCount}
        />
      </div>
    </div>
  );
}

function SchemeLeadMeasureCard({
  scheme,
  onClick,
}: {
  scheme: SchemeLeadMeasure;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium">{scheme.schemeName}</span>
          {scheme.measureType === "streak" && (
            <Flame className="size-4 text-[var(--warning,var(--foreground))]" />
          )}
        </div>

        {scheme.measureType === "streak" && scheme.streak && (
          <>
            <div className="text-xl font-medium text-[var(--warning,var(--foreground))]">
              {scheme.streak.completedMonths > 0
                ? `${scheme.streak.completedMonths} month${scheme.streak.completedMonths > 1 ? "s" : ""} streak`
                : "Just getting started"}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {scheme.streak.hasContributedThisMonth
                ? "This month's done — see you next month"
                : "Contribute this month to keep it going"}
            </div>
          </>
        )}

        {scheme.measureType === "project_progress" && scheme.projectProgress && (
          <>
            {scheme.projectProgress.percentage !== null ? (
              <>
                <div className="mb-1.5 text-xl font-medium text-[var(--primary)]">
                  {scheme.projectProgress.percentage}% raised
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--primary)]/15">
                  <div
                    className="h-full rounded-full bg-[var(--primary)]"
                    style={{ width: `${Math.min(100, scheme.projectProgress.percentage)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {formatCurrency(scheme.projectProgress.raisedAmount)} of{" "}
                  {formatCurrency(scheme.projectProgress.targetAmount ?? "0")}
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)]">
                {formatCurrency(scheme.projectProgress.raisedAmount)} raised so far
              </div>
            )}
          </>
        )}

        {scheme.measureType === "own_total" && scheme.ownTotal && (
          <>
            <div className="text-xl font-medium">{formatCurrency(scheme.ownTotal.amount)}</div>
            <div className="text-xs text-[var(--muted-foreground)]">your total so far</div>
          </>
        )}

        {scheme.measureType === "collective_balance" && scheme.collectiveBalance && (
          <>
            <div className="text-xl font-medium">
              {formatCurrency(scheme.collectiveBalance.amount)}
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">the group's fund balance</div>
          </>
        )}
      </Card>
    </button>
  );
}

function ActionItemCard({
  item,
  onClick,
}: {
  item: PersonalActionItem;
  onClick: () => void;
}) {
  const Icon = item.type === "unallocated_payment" ? Clock : AlertCircle;

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className="flex items-center gap-2.5 rounded-2xl border-0 bg-[var(--secondary)] p-3.5 shadow-none ring-0">
        <Icon className="size-4 shrink-0 text-[var(--foreground)]" />
        <div>
          <div className="text-sm font-medium">{formatCurrency(item.amount)}</div>
          <div className="text-xs text-[var(--muted-foreground)]">{item.detail}</div>
        </div>
      </Card>
    </button>
  );
}
