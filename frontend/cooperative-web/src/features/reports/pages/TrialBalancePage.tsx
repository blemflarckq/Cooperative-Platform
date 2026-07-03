import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { ReportActions } from "@/components/common/ReportActions";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useTrialBalance } from "../hooks/useTrialBalance";

export function TrialBalancePage() {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const trialBalanceQuery = useTrialBalance({ dateFrom, dateTo });

  if (trialBalanceQuery.isLoading) return <LoadingState />;

  if (trialBalanceQuery.isError || !trialBalanceQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load financial health check"
            : "Could not load trial balance"
        }
      />
    );
  }

  const trialBalance = trialBalanceQuery.data;
  const isBalanced = Number(trialBalance.totals.difference) === 0;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Reports" },
          {
            label: isCommunityMode
              ? t.term("trialBalance")
              : "Trial Balance",
          },
        ]}
      />

      <PageHeader
        title={isCommunityMode ? t.term("trialBalance") : "Trial Balance"}
        description={
          isCommunityMode
            ? "Check whether the organization’s financial records are balanced for the selected period."
            : "Verify that total debits equal total credits across accounts for the selected period."
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

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryBox
          label={isCommunityMode ? "Debit Side" : "Total Debits"}
          value={formatCurrency(trialBalance.totals.debitTotal)}
        />

        <SummaryBox
          label={isCommunityMode ? "Credit Side" : "Total Credits"}
          value={formatCurrency(trialBalance.totals.creditTotal)}
        />

        <SummaryBox
          label={isCommunityMode ? "Difference" : "Difference"}
          value={formatCurrency(trialBalance.totals.difference)}
          healthy={isBalanced}
        />
      </div>

      {isCommunityMode ? (
        <Card
          className={
            isBalanced
              ? "mb-6 border-emerald-200 bg-emerald-50"
              : "mb-6 border-red-200 bg-red-50"
          }
        >
          <CardContent className="p-4">
            <p className="font-semibold text-[var(--foreground)]">
              {isBalanced ? "Records are balanced" : "Records need attention"}
            </p>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {isBalanced
                ? "The debit and credit sides match for this period."
                : "The debit and credit sides do not match. A professional user should review the financial records."}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>
            {isCommunityMode ? "Money Categories" : "Accounts"}
          </CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <tr>
                <th className="px-4 py-3 text-left">
                  {isCommunityMode ? "Money Category" : "Account"}
                </th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>

            <tbody>
              {trialBalance.lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[var(--muted-foreground)]"
                  >
                    {isCommunityMode
                      ? "No financial health check lines found."
                      : "No trial balance lines found."}
                  </td>
                </tr>
              ) : (
                trialBalance.lines.map((line) => (
                  <tr
                    key={line.accountId}
                    className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--secondary)]"
                    onClick={() =>
                      navigate(
                        appPath(`/reports/accounts/${line.accountId}/ledger`),
                      )
                    }
                  >
                    <td className="px-4 py-3 font-medium">
                      {line.accountCode} · {line.accountName}
                    </td>

                    <td className="px-4 py-3">{line.accountType}</td>

                    <td className="px-4 py-3 text-right">
                      {formatCurrency(line.debitTotal)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatCurrency(line.creditTotal)}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(line.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
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
  healthy,
}: {
  label: string;
  value: ReactNode;
  healthy?: boolean;
}) {
  return (
    <div
      className={
        healthy
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