import { AlertTriangle, Clock, Users, Layers } from "lucide-react";

import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PermissionGate } from "@/components/common/PermissionGate";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatCurrency } from "@/lib/formatting/currency";
import { useAdminDashboard } from "../hooks/useAdminDashboard";

/**
 * A genuinely separate screen from the member dashboard, not a mode
 * toggle — the explicit product decision. Every metric here is built
 * from what's actually computable today: the two at-risk figures
 * (total exposure, oldest case) are shown side by side rather than one
 * ranked list forced to pick a single sort order, and approval aging
 * surfaces operational health, not just financial health.
 */
export function AdminDashboardPage() {
  const { user } = useAuth();
  const dashboardQuery = useAdminDashboard();

  if (dashboardQuery.isLoading) return <LoadingState />;
  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <ErrorState title="Could not load tenant health" />;
  }

  const data = dashboardQuery.data;
  const atRiskIsMeaningful = data.loanPortfolio.atRiskPercentage !== null;

  return (
    <PermissionGate
      permissions={["accounting_settings:update"]}
      fallback={<ErrorState title="You don't have access to this page" />}
    >
      <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
        <div>
          <div className="text-xs text-[var(--muted-foreground)]">Tenant health</div>
          <h1 className="text-lg font-semibold">{user?.tenantName ?? "Your cooperative"}</h1>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Card className="rounded-lg border-0 bg-[var(--secondary)] p-3.5 shadow-none ring-0">
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-[var(--muted-foreground)]" />
              <span className="text-xl font-medium">{data.activeMemberCount}</span>
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">active members</div>
          </Card>
          <Card className="rounded-lg border-0 bg-[var(--secondary)] p-3.5 shadow-none ring-0">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-[var(--muted-foreground)]" />
              <span className="text-xl font-medium">{data.activeSchemeCount}</span>
            </div>
            <div className="text-xs text-[var(--muted-foreground)]">active schemes</div>
          </Card>
        </div>

        <div>
          <div className="mb-2 text-xs text-[var(--muted-foreground)]">Loan portfolio</div>
          <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--muted-foreground)]">at risk</div>
                <div className="text-lg font-medium text-[var(--destructive)]">
                  {formatCurrency(data.loanPortfolio.atRiskAmount)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[var(--muted-foreground)]">oldest case</div>
                <div className="text-lg font-medium">
                  {data.loanPortfolio.oldestAtRiskDays !== null
                    ? `${data.loanPortfolio.oldestAtRiskDays} days`
                    : "—"}
                </div>
              </div>
            </div>
            {atRiskIsMeaningful ? (
              <>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--destructive)]/15">
                  <div
                    className="h-full rounded-full bg-[var(--destructive)]"
                    style={{ width: `${Math.min(100, data.loanPortfolio.atRiskPercentage!)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {data.loanPortfolio.atRiskPercentage}% of portfolio
                </div>
              </>
            ) : (
              <div className="text-xs text-[var(--muted-foreground)]">
                No active loan portfolio yet
              </div>
            )}
          </Card>
        </div>

        {data.approvals.pendingOverThresholdCount > 0 && (
          <div>
            <div className="mb-2 text-xs text-[var(--muted-foreground)]">Needs a decision</div>
            <Card className="flex items-center gap-2.5 rounded-2xl border-0 bg-[var(--secondary)] p-3.5 shadow-none ring-0">
              <Clock className="size-4 shrink-0 text-[var(--foreground)]" />
              <div>
                <div className="text-sm font-medium">
                  {data.approvals.pendingOverThresholdCount} approval
                  {data.approvals.pendingOverThresholdCount > 1 ? "s" : ""} waiting over{" "}
                  {data.approvals.thresholdDays} days
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Longest: {data.approvals.longestPendingDays} days
                </div>
              </div>
            </Card>
          </div>
        )}

        {atRiskIsMeaningful && data.loanPortfolio.atRiskPercentage! > 20 && (
          <Card className="flex items-center gap-2.5 rounded-2xl border-0 bg-[var(--destructive)]/10 p-3.5 shadow-none ring-0">
            <AlertTriangle className="size-4 shrink-0 text-[var(--destructive)]" />
            <div className="text-xs text-[var(--destructive)]">
              More than a fifth of the loan portfolio is currently at risk.
            </div>
          </Card>
        )}
      </div>
    </PermissionGate>
  );
}
