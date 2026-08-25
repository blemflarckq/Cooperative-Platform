import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { TenantUserListItem } from "@/features/tenant-users/types/tenant-user.types";

import { useTenantUserSearch } from "../hooks/useTenantUserSearch";
import { useOutstandingObligations } from "../hooks/useOutstandingObligations";
import { useAllocatePayment } from "../hooks/useAllocatePayment";

/**
 * The payer never has to do arithmetic here — the ranked obligation list
 * is pre-filled greedily (highest-priority loans first, remainder to
 * savings) the moment an amount is entered. Every line stays editable for
 * when the default split isn't what actually happened.
 */
export function RecordPaymentPage() {
  const { navigateToApp } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const allocateMutation = useAllocatePayment();

  const [payerQuery, setPayerQuery] = useState("");
  const debouncedPayerQuery = useDebouncedValue(payerQuery, 300);
  const [selectedPayer, setSelectedPayer] = useState<TenantUserListItem | null>(null);
  const [totalAmount, setTotalAmount] = useState("");
  const [lineAmounts, setLineAmounts] = useState<Record<string, string>>({});
  const [remainderCycleId, setRemainderCycleId] = useState<string | null>(null);

  const searchQuery = useTenantUserSearch(debouncedPayerQuery);
  const obligationsQuery = useOutstandingObligations(selectedPayer?.id ?? "");
  const obligations = obligationsQuery.data;

  // Greedy pre-fill whenever the total or the payer changes — obligations
  // are already ranked by the backend (at-risk first, then highest rate).
  useEffect(() => {
    if (!obligations || !totalAmount || Number(totalAmount) <= 0) {
      setLineAmounts({});
      return;
    }

    let remaining = Number(totalAmount);
    const next: Record<string, string> = {};

    for (const loan of obligations.loans) {
      if (remaining <= 0) break;
      const payoff = Number(loan.payoffAmount);
      const applied = Math.min(remaining, payoff);
      next[loan.loanId] = applied.toFixed(2);
      remaining = Math.round((remaining - applied) * 100) / 100;
    }

    setLineAmounts(next);

    if (obligations.remainderTargets.length === 1) {
      setRemainderCycleId(obligations.remainderTargets[0].cycleId);
    }
  }, [obligations, totalAmount]);

  const allocatedToLoans = useMemo(
    () => Object.values(lineAmounts).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [lineAmounts],
  );
  const remainderAmount = Math.max(
    0,
    Math.round((Number(totalAmount || 0) - allocatedToLoans) * 100) / 100,
  );
  const isFullyAllocated =
    Number(totalAmount) > 0 &&
    Math.round((allocatedToLoans + remainderAmount) * 100) / 100 ===
      Math.round(Number(totalAmount) * 100) / 100;

  function selectPayer(payer: TenantUserListItem) {
    setSelectedPayer(payer);
    setPayerQuery("");
    setTotalAmount("");
    setLineAmounts({});
    setRemainderCycleId(null);
  }

  async function handleConfirm() {
    if (!selectedPayer || !isFullyAllocated) return;

    const loanAllocations = Object.entries(lineAmounts)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([loanId, amount]) => ({ loanId, amount }));

    const remainder =
      remainderAmount > 0 && remainderCycleId
        ? { cycleId: remainderCycleId, amount: remainderAmount.toFixed(2) }
        : undefined;

    try {
      await allocateMutation.mutateAsync({
        tenantUserId: selectedPayer.id,
        payload: { totalAmount, loanAllocations, remainder },
      });
      toast.success(isCommunityMode ? "Payment recorded" : "Payment allocated");
      navigateToApp("/");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <button
        type="button"
        onClick={() => navigateToApp("/")}
        className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]"
      >
        <ArrowLeft className="size-5 text-[var(--muted-foreground)]" />
        Record a payment
      </button>

      {!selectedPayer ? (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-2 text-sm font-medium">Who paid?</div>
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5">
            <Search className="size-4 text-[var(--muted-foreground)]" />
            <input
              value={payerQuery}
              onChange={(e) => setPayerQuery(e.target.value)}
              placeholder="Search by name or email"
              className="w-full bg-transparent text-sm outline-none"
              autoFocus
            />
          </div>
          {searchQuery.data && searchQuery.data.length > 0 && (
            <div className="flex flex-col gap-1">
              {searchQuery.data.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => selectPayer(person)}
                  className="rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--secondary)]"
                >
                  {person.firstName} {person.lastName}
                  <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                    {person.email}
                  </span>
                </button>
              ))}
            </div>
          )}
          {debouncedPayerQuery.trim().length >= 2 &&
            searchQuery.data &&
            searchQuery.data.length === 0 && (
              <div className="px-1 py-2 text-xs text-[var(--muted-foreground)]">
                No one found matching that.
              </div>
            )}
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--muted-foreground)]">Recording payment from</div>
              <div className="text-base font-medium">
                {selectedPayer.firstName} {selectedPayer.lastName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => selectPayer(null as unknown as TenantUserListItem)}
              className="text-xs text-[var(--muted-foreground)]"
            >
              <X className="size-4" />
            </button>
          </div>

          <Card className="rounded-2xl border-0 bg-[var(--primary)] p-4 shadow-none ring-0">
            <div className="mb-1 text-xs text-white/80">Amount received</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl text-white/80">M</span>
              <input
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-full bg-transparent text-3xl font-medium text-white outline-none placeholder:text-white/40"
              />
            </div>
          </Card>

          {obligationsQuery.isLoading && (
            <div className="text-xs text-[var(--muted-foreground)]">Loading obligations…</div>
          )}

          {obligations && Number(totalAmount) > 0 && (
            <>
              {obligations.loans.length > 0 && (
                <div className="text-xs text-[var(--muted-foreground)]">
                  Suggested allocation, ranked by urgency
                </div>
              )}

              {obligations.loans.map((loan) => (
                <Card
                  key={loan.loanId}
                  className={`rounded-2xl p-3.5 shadow-none ring-0 ${
                    loan.isAtRiskFlagged
                      ? "border border-[var(--destructive)]/40"
                      : "border border-[var(--border)]"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {loan.isAtRiskFlagged && (
                        <AlertTriangle className="size-3.5 text-[var(--destructive)]" />
                      )}
                      <span className="text-sm font-medium">{loan.schemeName} loan</span>
                    </div>
                    {loan.isAtRiskFlagged ? (
                      <span className="text-xs text-[var(--destructive)]">at risk</span>
                    ) : (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {loan.currentRate}% rate
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatCurrency(loan.payoffAmount)} owed, including interest
                    </span>
                    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1">
                      <span className="text-xs text-[var(--muted-foreground)]">M</span>
                      <input
                        value={lineAmounts[loan.loanId] ?? ""}
                        onChange={(e) =>
                          setLineAmounts((prev) => ({
                            ...prev,
                            [loan.loanId]: e.target.value,
                          }))
                        }
                        inputMode="decimal"
                        className="w-16 bg-transparent text-right text-sm font-medium outline-none"
                      />
                    </div>
                  </div>
                </Card>
              ))}

              {remainderAmount > 0 && (
                <Card className="rounded-2xl border border-dashed border-[var(--border)] p-3.5 shadow-none ring-0">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium">Remaining, as savings</span>
                    {obligations.remainderTargets.length > 1 ? (
                      <select
                        value={remainderCycleId ?? ""}
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
                <span
                  className={`text-xs font-medium ${
                    isFullyAllocated ? "text-[var(--text-success,var(--foreground))]" : "text-[var(--destructive)]"
                  }`}
                >
                  {formatCurrency(allocatedToLoans + remainderAmount)} of {formatCurrency(totalAmount)}
                </span>
              </div>

              <Button
                className="h-12 w-full"
                disabled={
                  !isFullyAllocated ||
                  allocateMutation.isPending ||
                  (remainderAmount > 0 && !remainderCycleId)
                }
                onClick={handleConfirm}
              >
                Confirm allocation
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
