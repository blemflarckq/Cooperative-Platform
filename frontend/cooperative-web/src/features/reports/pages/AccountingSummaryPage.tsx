import { useState, type ReactNode } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { ReportActions } from "@/components/common/ReportActions";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";

import { useAccountingSummary } from "../hooks/useAccountingSummary";

export function AccountingSummaryPage() {
  const { isCommunityMode } = useExperienceMode();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const summaryQuery = useAccountingSummary({ dateFrom, dateTo });

  if (summaryQuery.isLoading) return <LoadingState />;

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load financial overview"
            : "Could not load accounting summary"
        }
      />
    );
  }

  const summary = summaryQuery.data;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Reports" },
          {
            label: isCommunityMode
              ? "Financial Overview"
              : "Accounting Summary",
          },
        ]}
      />

      <PageHeader
        title={isCommunityMode ? "Financial Overview" : "Accounting Summary"}
        description={
          isCommunityMode
            ? "A high-level view of what the organization owns, owes, earned, and spent for the selected period."
            : "High-level financial position and performance summary for the selected period."
        }
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

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label={isCommunityMode ? "Money / Value Owned" : "Assets"}
          value={formatCurrency(summary.totals.assets)}
        />

        <SummaryCard
          label={isCommunityMode ? "Money Owed" : "Liabilities"}
          value={formatCurrency(summary.totals.liabilities)}
        />

        <SummaryCard
          label={isCommunityMode ? "Group Value" : "Equity"}
          value={formatCurrency(summary.totals.equity)}
        />

        <SummaryCard
          label={isCommunityMode ? "Money Earned" : "Income"}
          value={formatCurrency(summary.totals.income)}
        />

        <SummaryCard
          label={isCommunityMode ? "Money Spent" : "Expenses"}
          value={formatCurrency(summary.totals.expenses)}
        />

        <SummaryCard
          label={
            isCommunityMode ? "Money Left After Expenses" : "Net Income"
          }
          value={formatCurrency(summary.totals.netIncome)}
          emphasized
        />
      </div>

      {isCommunityMode ? (
        <Card className="mt-6 border-[var(--border)] bg-[var(--secondary)]">
          <CardContent className="p-4">
            <p className="font-semibold text-[var(--foreground)]">
              Plain-language guide
            </p>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              This report is a simplified view of the accounting position. For
              audit-level detail, switch to Professional Mode and review the
              Trial Balance and Account Ledger.
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

function SummaryCard({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <Card
      className={
        emphasized
          ? "border-emerald-200 bg-emerald-50"
          : "border-[var(--border)] bg-[var(--card)]"
      }
    >
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}