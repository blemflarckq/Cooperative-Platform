import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";

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
import { formatDate } from "@/lib/formatting/date";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useAccountLedger } from "../hooks/useAccountLedger";

export function AccountLedgerPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const ledgerQuery = useAccountLedger(accountId!, { dateFrom, dateTo });

  if (ledgerQuery.isLoading) return <LoadingState />;

  if (ledgerQuery.isError || !ledgerQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load money movement history"
            : "Could not load account ledger"
        }
      />
    );
  }

  const ledger = ledgerQuery.data;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Reports" },
          {
            label: isCommunityMode
              ? t.term("trialBalance")
              : "Trial Balance",
            to: "/reports/trial-balance",
          },
          { label: `${ledger.accountCode} · ${ledger.accountName}` },
        ]}
      />

      <PageHeader
        title={
          isCommunityMode ? t.term("accountLedger") : "Account Ledger"
        }
        description={`${ledger.accountCode} · ${ledger.accountName}`}
        backTo="/reports/trial-balance"
        backLabel={
          isCommunityMode
            ? `Back to ${t.term("trialBalance")}`
            : "Back to Trial Balance"
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

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>
            {isCommunityMode ? "Movement Records" : "Ledger Lines"}
          </CardTitle>

          <p className="text-sm text-[var(--muted-foreground)]">
            {isCommunityMode
              ? "Detailed movement history for this money category."
              : "Detailed debit and credit history for this account."}
          </p>
        </CardHeader>

        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">
                  {isCommunityMode ? "Record" : "Entry"}
                </th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">
                  {isCommunityMode ? "Running Balance" : "Running Balance"}
                </th>
              </tr>
            </thead>

            <tbody>
              {ledger.lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-[var(--muted-foreground)]"
                  >
                    {isCommunityMode
                      ? "No movement records found for this period."
                      : "No ledger lines found for this period."}
                  </td>
                </tr>
              ) : (
                ledger.lines.map((line) => (
                  <tr
                    key={`${line.journalEntryId}-${line.transactionDate}-${line.debit}-${line.credit}`}
                    className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--secondary)]"
                    onClick={() =>
                      navigate(
                        appPath(
                          `/accounting/journal-entries/${line.journalEntryId}`,
                        ),
                      )
                    }
                  >
                    <td className="px-4 py-3">
                      {formatDate(line.transactionDate)}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {line.entryNumber}
                    </td>

                    <td className="px-4 py-3">{line.description}</td>

                    <td className="px-4 py-3 text-right">
                      {Number(line.debit) > 0
                        ? formatCurrency(line.debit)
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {Number(line.credit) > 0
                        ? formatCurrency(line.credit)
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(line.runningBalance)}
                    </td>
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
              Professional accounting note
            </p>

            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              This report still uses debit and credit columns because it is an
              accounting audit report. Community Mode simplifies the surrounding
              language, but the accounting record remains precise.
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