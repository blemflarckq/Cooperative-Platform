import { RotateCcw } from "lucide-react";
import { useParams } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatDate, formatDateTime } from "@/lib/formatting/date";
import { useJournalEntry } from "../hooks/useJournalEntry";
import { useReverseJournalEntry } from "../hooks/useReverseJournalEntry";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { ReportActions } from "@/components/common/ReportActions";

export function JournalEntryDetailsPage() {
  const { journalEntryId } = useParams<{ journalEntryId: string }>();

  const [reverseOpen, setReverseOpen] = useState(false);
  const [reason, setReason] = useState("");

  const entryQuery = useJournalEntry(journalEntryId!);
  const reverseMutation = useReverseJournalEntry();

  if (entryQuery.isLoading) return <LoadingState />;
  if (entryQuery.isError || !entryQuery.data) {
    return <ErrorState title="Could not load journal entry" />;
  }

  const entry = entryQuery.data;

  const totalDebits = entry.lines
    .filter((line) => line.lineType === "DEBIT")
    .reduce((sum, line) => sum + Number(line.amount), 0);

  const totalCredits = entry.lines
    .filter((line) => line.lineType === "CREDIT")
    .reduce((sum, line) => sum + Number(line.amount), 0);

  function handleReverse() {
    reverseMutation.mutate(
      { id: entry.id, reason },
      {
        onSuccess: () => {
          toast.success("Journal entry reversed");
          setReverseOpen(false);
          setReason("");
        },
        onError: (error) => toast.error(getApiErrorMessage(error)),
      },
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Journal Entries", to: "/accounting/journal-entries" },
          { label: entry.entryNumber },
        ]}
      />
      <PageHeader
        title={entry.entryNumber}
        description="Review the immutable double-entry accounting record."
        backTo="/accounting/journal-entries"
        backLabel="Back to Journals"
        actions={
          <div className="flex flex-wrap gap-2">
            <ReportActions />

            <PermissionGate permissions={["journal_entry:reverse"]}>
              <Button
                variant="outline"
                disabled={entry.status !== "POSTED"}
                onClick={() => setReverseOpen(true)}
                className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <RotateCcw className="mr-2 size-4" />
                Reverse
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <Detail label="Status" value={<StatusBadge status={entry.status} />} />
            <Detail label="Transaction Date" value={formatDate(entry.transactionDate)} />
            <Detail label="Source Module" value={entry.sourceModule} />
            <Detail label="Source Reference" value={entry.sourceReference ?? "—"} />
            <Detail label="Created" value={formatDateTime(entry.createdAt)} />
            <Detail label="Updated" value={formatDateTime(entry.updatedAt)} />
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>Balance Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Detail label="Total Debits" value={formatCurrency(totalDebits)} />
            <Detail label="Total Credits" value={formatCurrency(totalCredits)} />
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              This posted journal entry is balanced and immutable.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-[var(--border)] bg-white">
        <CardHeader>
          <CardTitle>Journal Lines</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <tr>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Memo</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line) => (
                <tr key={line.id} className="border-b border-[var(--border)]">
                  <td className="px-4 py-3">
                    {line.account
                      ? `${line.account.code} · ${line.account.name}`
                      : line.accountId}
                  </td>
                  <td className="px-4 py-3">{line.memo ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {line.lineType === "DEBIT"
                      ? formatCurrency(line.amount)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {line.lineType === "CREDIT"
                      ? formatCurrency(line.amount)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--card)]">
          <DialogHeader>
            <DialogTitle>Reverse journal entry?</DialogTitle>
            <DialogDescription>
              This will post an opposite journal entry and mark the original as
              reversed. Use this only for correction.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium">Reason</label>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this entry is being reversed"
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reverseMutation.isPending || reason.trim().length < 3}
              onClick={handleReverse}
            >
              {reverseMutation.isPending ? "Reversing..." : "Reverse Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}