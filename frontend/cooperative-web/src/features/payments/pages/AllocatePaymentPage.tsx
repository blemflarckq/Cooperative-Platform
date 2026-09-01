import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { getApiErrorMessage } from "@/lib/api/api-error";

import { useCurrentTenantUser } from "@/features/tenant-users/hooks/useCurrentTenantUser";
import { useUnallocatedPayments } from "../hooks/useUnallocatedPayments";
import { useOutstandingObligations } from "../hooks/useOutstandingObligations";
import { useAllocatePayment } from "../hooks/useAllocatePayment";

/**
 * The actual "no arithmetic required" moment — obligations are already
 * ranked (at-risk first, then highest rate) by the backend; this screen
 * greedily pre-fills them the moment it loads, every line stays editable.
 */
export function AllocatePaymentPage() {
  const { recordedPaymentId } = useParams<{ recordedPaymentId: string }>();
  const { navigateToApp } = useTenantNavigation();

  const currentUser = useCurrentTenantUser();
  const paymentsQuery = useUnallocatedPayments(currentUser.data?.id ?? "");
  const obligationsQuery = useOutstandingObligations(currentUser.data?.id ?? "");
  const allocateMutation = useAllocatePayment(currentUser.data?.id ?? "");

  const payment = paymentsQuery.data?.find((p) => p.id === recordedPaymentId);
  const obligations = obligationsQuery.data;

  const [lineAmounts, setLineAmounts] = useState<Record<string, string> | null>(null);
  const [remainderCycleId, setRemainderCycleId] = useState<string | null>(null);

  const resolvedLines = useMemo(() => {
    if (lineAmounts !== null || !obligations || !payment) return lineAmounts ?? {};

    let remaining = Number(payment.amount);
    const next: Record<string, string> = {};
    for (const loan of obligations.loans) {
      if (remaining <= 0) break;
      const applied = Math.min(remaining, Number(loan.payoffAmount));
      next[loan.loanId] = applied.toFixed(2);
      remaining = Math.round((remaining - applied) * 100) / 100;
    }
    return next;
  }, [lineAmounts, obligations, payment]);

  if (currentUser.isLoading || paymentsQuery.isLoading || obligationsQuery.isLoading) {
    return <LoadingState />;
  }
  if (!payment) return <ErrorState title="This payment could not be found" />;
  if (!obligations) return <ErrorState title="Could not load obligations" />;

  const allocatedToLoans = Object.values(resolvedLines).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
  const remainderAmount = Math.max(
    0,
    Math.round((Number(payment.amount) - allocatedToLoans) * 100) / 100,
  );
  const isFullyAllocated =
    Math.round((allocatedToLoans + remainderAmount) * 100) / 100 ===
    Math.round(Number(payment.amount) * 100) / 100;

  const effectiveRemainderCycleId =
    remainderCycleId ?? obligations.remainderTargets[0]?.cycleId ?? null;

  async function handleConfirm() {
    if (!isFullyAllocated || !payment) return;

    const loanAllocations = Object.entries(resolvedLines)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([loanId, amount]) => ({ loanId, amount }));

    const remainder =
      remainderAmount > 0 && effectiveRemainderCycleId
        ? { cycleId: effectiveRemainderCycleId, amount: remainderAmount.toFixed(2) }
        : undefined;

    try {
      await allocateMutation.mutateAsync({
        recordedPaymentId: payment.id,
        payload: { loanAllocations, remainder },
      });
      toast.success("Payment allocated");
      navigateToApp("/payments");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <button
        type="button"
        onClick={() => navigateToApp("/payments")}
        className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]"
      >
        <ArrowLeft className="size-5 text-[var(--muted-foreground)]" />
        Allocate this payment
      </button>

      <Card className="rounded-2xl border-0 bg-[var(--primary)] p-4 shadow-none ring-0">
        <div className="mb-1 text-xs text-white/80">Amount to allocate</div>
        <div className="text-3xl font-medium text-white">{formatCurrency(payment.amount)}</div>
      </Card>

      {obligations.loans.length > 0 && (
        <div className="text-xs text-[var(--muted-foreground)]">
          Suggested allocation, ranked by urgency
        </div>
      )}

      {obligations.loans.map((loan) => (
        <Card
          key={loan.loanId}
          className={`rounded-2xl p-4 shadow-none ring-0 ${
            loan.isAtRiskFlagged
              ? "border border-[var(--destructive)]/40"
              : "border border-[var(--border)]"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {loan.isAtRiskFlagged && (
                <AlertTriangle className="size-3.5 shrink-0 text-[var(--destructive)]" />
              )}
              <span className="text-sm font-medium">{loan.schemeName} loan</span>
            </div>
            {loan.isAtRiskFlagged ? (
              <span className="text-xs text-[var(--destructive)]">at risk</span>
            ) : (
              <span className="text-xs text-[var(--muted-foreground)]">{loan.currentRate}% rate</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--muted-foreground)]">
              {formatCurrency(loan.payoffAmount)} owed, including interest
            </span>
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5">
              <span className="text-xs text-[var(--muted-foreground)]">M</span>
              <input
                value={resolvedLines[loan.loanId] ?? ""}
                onChange={(e) =>
                  setLineAmounts({ ...resolvedLines, [loan.loanId]: e.target.value })
                }
                inputMode="decimal"
                className="w-16 bg-transparent text-right text-sm font-medium outline-none"
              />
            </div>
          </div>
        </Card>
      ))}

      {remainderAmount > 0 && (
        <Card className="rounded-2xl border border-dashed border-[var(--border)] p-4 shadow-none ring-0">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium">Remaining, as savings</span>
            {obligations.remainderTargets.length > 1 ? (
              <select
                value={effectiveRemainderCycleId ?? ""}
                onChange={(e) => setRemainderCycleId(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-xs"
              >
                <option value="" disabled>
                  Choose scheme
                </option>
                {obligations.remainderTargets.map((target) => (
                  <option key={target.cycleId} value={target.cycleId}>
                    {target.schemeName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-[var(--muted-foreground)]">
                {obligations.remainderTargets[0]?.schemeName ?? "No active scheme"}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted-foreground)]">
              {obligations.loans.length === 0
                ? "No outstanding obligations"
                : "No outstanding obligations left"}
            </span>
            <span className="text-sm font-medium">{formatCurrency(remainderAmount)}</span>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between border-t border-[var(--border)] py-2.5">
        <span className="text-xs text-[var(--muted-foreground)]">
          {isFullyAllocated ? "Fully allocated" : "Not fully allocated yet"}
        </span>
        <span className="text-xs font-medium">
          {formatCurrency(allocatedToLoans + remainderAmount)} of {formatCurrency(payment.amount)}
        </span>
      </div>

      <Button
        className="h-12 w-full"
        disabled={
          !isFullyAllocated ||
          allocateMutation.isPending ||
          (remainderAmount > 0 && !effectiveRemainderCycleId)
        }
        onClick={handleConfirm}
      >
        Confirm allocation
      </Button>
    </div>
  );
}
