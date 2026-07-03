import { useState, type ReactNode } from "react";
import { useParams } from "react-router";

import { ReportActions } from "@/components/common/ReportActions";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";

import { useMemberSavingsStatement } from "../hooks/useMemberSavingsStatement";

export function MemberSavingsStatementPage() {
  const { tenantUserId } = useParams<{ tenantUserId: string }>();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const statementQuery = useMemberSavingsStatement(tenantUserId!, {
    dateFrom,
    dateTo,
  });

  if (statementQuery.isLoading) return <LoadingState />;

  if (statementQuery.isError || !statementQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load member savings"
            : "Could not load savings statement"
        }
      />
    );
  }

  const statement = statementQuery.data;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: isCommunityMode ? "People" : "Identity" },
          {
            label: isCommunityMode ? "Member" : "Member",
            to: `/members/${tenantUserId}`,
          },
          {
            label: isCommunityMode
              ? t.term("savingsStatement")
              : "Savings Statement",
          },
        ]}
      />

      <PageHeader
        title={
          isCommunityMode
            ? t.term("savingsStatement")
            : "Member Savings Statement"
        }
        description={
          isCommunityMode
            ? "Review money recorded for this member, including corrections and net savings."
            : "Review this member’s posted and reversed contributions."
        }
        backTo={`/members/${tenantUserId}`}
        backLabel={isCommunityMode ? "Back to Member" : "Back to Member"}
        actions={<ReportActions />}
      />

      <Card className="mb-6 border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>
            {isCommunityMode ? "Choose Date Range" : "Date Range"}
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2">
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
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <SummaryBox
          label={isCommunityMode ? "Recorded Payments" : "Posted Count"}
          value={statement.totals.postedContributionCount}
        />

        <SummaryBox
          label={isCommunityMode ? "Corrections" : "Reversed Count"}
          value={statement.totals.reversedContributionCount}
        />

        <SummaryBox
          label={isCommunityMode ? "Money Recorded" : "Total Posted"}
          value={formatCurrency(statement.totals.totalPosted)}
        />

        <SummaryBox
          label={isCommunityMode ? "Net Saved" : "Net Savings"}
          value={formatCurrency(statement.totals.netSavings)}
          emphasized
        />
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>
            {isCommunityMode ? "Savings Records" : "Statement Lines"}
          </CardTitle>

          <p className="text-sm text-[var(--muted-foreground)]">
            {isCommunityMode
              ? "Each line shows money received or corrected for this member."
              : "Detailed contribution activity for this member."}
          </p>
        </CardHeader>

        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--secondary)]">
              <tr>
                <th className="px-4 py-3 text-left">
                  {isCommunityMode ? "Receipt Reference" : "Reference"}
                </th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">
                  {isCommunityMode ? t.term("contributionSource") : "Source"}
                </th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>

            <tbody>
              {statement.lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-[var(--muted-foreground)]"
                  >
                    {isCommunityMode
                      ? "No savings records found for this period."
                      : "No statement lines found."}
                  </td>
                </tr>
              ) : (
                statement.lines.map((line) => (
                  <tr
                    key={line.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3 font-medium">
                      {line.reference}
                    </td>

                    <td className="px-4 py-3">
                      {formatDate(line.contributionDate)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatCurrency(line.amount)}
                    </td>

                    <td className="px-4 py-3">
                      {line.source.replaceAll("_", " ")}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={line.status} />
                    </td>

                    <td className="px-4 py-3">{line.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isCommunityMode ? (
        <Card className="mt-6 border-[var(--border)] bg-[var(--secondary)]">
          <CardContent className="p-4">
            <p className="font-semibold text-[var(--foreground)]">
              What this means
            </p>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Money recorded is the total captured for this member. Corrections
              reduce or cancel records that were entered incorrectly. Net saved
              is the amount remaining after corrections.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function FieldWithLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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
  emphasized,
}: {
  label: string;
  value: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
          : "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}