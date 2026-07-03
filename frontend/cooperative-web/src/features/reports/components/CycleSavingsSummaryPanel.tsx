import { useState } from "react";
import { TrendingUp } from "lucide-react";

import { ReportActions } from "@/components/common/ReportActions";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";

import { useCycleSavingsSummary } from "../hooks/useCycleSavingsSummary";

interface CycleSavingsSummaryPanelProps {
  cycleId: string;
}

export function CycleSavingsSummaryPanel({
  cycleId,
}: CycleSavingsSummaryPanelProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const summaryQuery = useCycleSavingsSummary(cycleId, {
    dateFrom,
    dateTo,
  });

  if (summaryQuery.isLoading) return <LoadingState />;

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load fund savings summary"
            : "Could not load savings summary"
        }
      />
    );
  }

  const summary = summaryQuery.data;

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-[var(--primary)]" />
              {isCommunityMode
                ? t.term("savingsSummary")
                : "Cycle Savings Summary"}
            </CardTitle>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {isCommunityMode
                ? "See how much money has been recorded, corrected, and saved in this activity period."
                : "View contribution totals and net savings for this operating cycle."}
            </p>
          </div>

          <ReportActions />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FieldWithLabel label="From">
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </FieldWithLabel>

          <FieldWithLabel label="To">
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </FieldWithLabel>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryBox
            label={
              isCommunityMode
                ? "Members Who Paid"
                : "Members Contributing"
            }
            value={summary.totals.participantCountWithContributions}
          />

          <SummaryBox
            label={isCommunityMode ? "Money Recorded" : "Posted"}
            value={formatCurrency(summary.totals.totalPosted)}
          />

          <SummaryBox
            label={isCommunityMode ? "Corrections" : "Reversed"}
            value={formatCurrency(summary.totals.totalReversed)}
          />

          <SummaryBox
            label={isCommunityMode ? "Net Saved" : "Net Savings"}
            value={formatCurrency(summary.totals.netSavings)}
          />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--secondary)]">
              <tr>
                <th className="px-4 py-3 text-left">
                  {isCommunityMode ? "Member" : "Member"}
                </th>
                <th className="px-4 py-3 text-right">
                  {isCommunityMode ? "Money Recorded" : "Posted"}
                </th>
                <th className="px-4 py-3 text-right">
                  {isCommunityMode ? "Corrections" : "Reversed"}
                </th>
                <th className="px-4 py-3 text-right">
                  {isCommunityMode ? "Net Saved" : "Net Savings"}
                </th>
                <th className="px-4 py-3 text-right">
                  {isCommunityMode ? "Records" : "Posted Count"}
                </th>
              </tr>
            </thead>

            <tbody>
              {summary.members.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[var(--muted-foreground)]"
                  >
                    {isCommunityMode
                      ? "No money received was found for this period."
                      : "No contribution activity found for this period."}
                  </td>
                </tr>
              ) : (
                summary.members.map((member) => (
                  <tr
                    key={member.tenantUserId}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--foreground)]">
                        {member.fullName ?? member.tenantUserId}
                      </p>

                      <p className="text-xs text-[var(--muted-foreground)]">
                        {member.email ?? "No email"}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatCurrency(member.totalPosted)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatCurrency(member.totalReversed)}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(member.netSavings)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <StatusBadge
                        status={
                          isCommunityMode
                            ? `${member.postedContributionCount} recorded`
                            : `${member.postedContributionCount} posted`
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {isCommunityMode ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              What this means
            </p>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Money recorded is the total received before corrections. Net saved
              is the amount remaining after correction records are considered.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FieldWithLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </span>

      {children}
    </label>
  );
}

function SummaryBox({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}