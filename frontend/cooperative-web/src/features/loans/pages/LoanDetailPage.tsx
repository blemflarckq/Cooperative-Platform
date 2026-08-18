import { useState } from "react";
import { useParams } from "react-router";
import { ArrowLeft, AlertTriangle, PiggyBank, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useAuth } from "@/lib/auth/AuthContext";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useLoan } from "../hooks/useLoan";
import { usePledgeToLoan } from "../hooks/usePledgeToLoan";
import { useRecordLoanRepayment } from "../hooks/useRecordLoanRepayment";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PLEDGES: "Waiting for your group to fund",
  PENDING_APPROVAL: "Waiting on approval",
  ACTIVE: "Active",
  AT_RISK: "Needs attention",
  REPAID: "Fully repaid",
};

/**
 * Matches the approved "loan detail" mockup: the dual-tranche breakdown
 * stays legible for the life of the loan, not just at request time — each
 * tranche re-explains what it means, per the design language's rule for
 * multi-part mechanics.
 */
export function LoanDetailPage() {
  const { loanId } = useParams<{ loanId: string }>();
  const { navigateToApp } = useTenantNavigation();
  const { user } = useAuth();
  const { isCommunityMode } = useExperienceMode();

  const loanQuery = useLoan(loanId ?? "");
  const pledgeMutation = usePledgeToLoan();
  const repaymentMutation = useRecordLoanRepayment();

  const [pledgeAmount, setPledgeAmount] = useState("");
  const [repaymentAmount, setRepaymentAmount] = useState("");

  if (!loanId) return <ErrorState title="No loan selected" />;
  if (loanQuery.isLoading) return <LoadingState />;
  if (loanQuery.isError || !loanQuery.data) {
    return <ErrorState title="Could not load this loan" />;
  }

  const loan = loanQuery.data;
  const isBorrower = loan.borrower?.user?.id === user?.id;

  const totalPrincipal = Number(loan.principalAmount);
  const totalOutstanding =
    Number(loan.selfFundedOutstandingPrincipal) + Number(loan.peerFundedOutstandingPrincipal);
  const totalPaid = totalPrincipal - totalOutstanding;
  const paidPct = totalPrincipal > 0 ? Math.min(100, Math.round((totalPaid / totalPrincipal) * 100)) : 0;

  const alreadyPledged = (loan.pledges ?? []).reduce(
    (sum, pledge) => sum + Number(pledge.pledgedAmount),
    0,
  );
  const stillNeeded = Number(loan.peerFundedPrincipal) - alreadyPledged;

  const alreadyPledgedByViewer = (loan.pledges ?? []).some(
    (pledge) => pledge.pledgingTenantUser?.user?.id === user?.id,
  );

  async function handlePledge() {
    if (!pledgeAmount || Number(pledgeAmount) <= 0) return;
    try {
      await pledgeMutation.mutateAsync({ loanId: loan.id, pledgedAmount: pledgeAmount });
      toast.success(isCommunityMode ? "Thanks for helping fund this" : "Pledge recorded");
      setPledgeAmount("");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function handleRepayment() {
    if (!repaymentAmount || Number(repaymentAmount) <= 0) return;
    try {
      await repaymentMutation.mutateAsync({ loanId: loan.id, amount: repaymentAmount });
      toast.success(isCommunityMode ? "Payment recorded" : "Repayment recorded");
      setRepaymentAmount("");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <button
        type="button"
        onClick={() => navigateToApp(`/schemes/${loan.schemeId}/loans`)}
        className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]"
      >
        <ArrowLeft className="size-5 text-[var(--muted-foreground)]" />
        {isCommunityMode ? "Your loan" : "Loan detail"}
      </button>

      {/* Hero status card */}
      <Card className="rounded-2xl border-0 bg-[var(--primary)] p-5 shadow-none ring-0">
        <div className="mb-1 text-xs text-white/80">{STATUS_LABEL[loan.status]}</div>

        {loan.status === "ACTIVE" || loan.status === "AT_RISK" ? (
          <>
            <div className="mb-3 text-3xl font-medium text-white">
              {formatCurrency(totalOutstanding)}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-white/80">
              {formatCurrency(totalPaid)} paid back of {formatCurrency(totalPrincipal)}
            </div>
          </>
        ) : loan.status === "PENDING_PLEDGES" ? (
          <>
            <div className="mb-3 text-2xl font-medium text-white">
              {formatCurrency(stillNeeded)} still needed
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: `${Number(loan.peerFundedPrincipal) > 0 ? Math.min(100, Math.round((alreadyPledged / Number(loan.peerFundedPrincipal)) * 100)) : 100}%`,
                }}
              />
            </div>
            <div className="mt-2 text-xs text-white/80">
              {formatCurrency(alreadyPledged)} pledged of {formatCurrency(loan.peerFundedPrincipal)}
            </div>
          </>
        ) : (
          <div className="text-2xl font-medium text-white">
            {formatCurrency(loan.principalAmount)}
          </div>
        )}
      </Card>

      {loan.isAtRiskFlagged && (
        <Card className="flex items-start gap-2.5 rounded-2xl border-0 bg-[var(--destructive)]/10 p-4 shadow-none ring-0">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--destructive)]" />
          <div className="text-xs text-[var(--destructive)]">
            {isCommunityMode
              ? "This loan needs attention — no new loans can be taken until it's fully repaid."
              : "Flagged at-risk — the peer-funded rate reached its cap. New loans blocked until fully repaid."}
          </div>
        </Card>
      )}

      {Number(loan.selfFundedPrincipal) > 0 && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className="size-4 text-[var(--muted-foreground)]" />
              <span className="text-sm">From your own savings</span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(loan.selfFundedOutstandingPrincipal)} left
            </span>
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            Grows your own balance as you repay
          </div>
        </Card>
      )}

      {Number(loan.peerFundedPrincipal) > 0 && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[var(--muted-foreground)]" />
              <span className="text-sm">From your group</span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(loan.peerFundedOutstandingPrincipal)} left
            </span>
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {loan.pledges && loan.pledges.length > 0
              ? `Funded by ${loan.pledges
                  .map((p) => p.pledgingTenantUser?.user?.firstName ?? "a member")
                  .join(", ")}`
              : "Not yet funded"}
          </div>
        </Card>
      )}

      {/* Pledge action — only for non-borrowers, while still open, who haven't already pledged */}
      {loan.status === "PENDING_PLEDGES" && !isBorrower && !alreadyPledgedByViewer && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-2 text-sm font-medium">
            {isCommunityMode ? "Help fund this" : "Pledge toward this loan"}
          </div>
          <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-3">
            <span className="text-[var(--muted-foreground)]">M</span>
            <input
              value={pledgeAmount}
              onChange={(e) => setPledgeAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-full bg-transparent text-lg font-medium outline-none"
            />
          </div>
          <Button
            className="h-11 w-full"
            disabled={pledgeMutation.isPending}
            onClick={handlePledge}
          >
            {isCommunityMode ? "Pledge" : "Submit pledge"}
          </Button>
        </Card>
      )}

      {/* Repayment action */}
      {(loan.status === "ACTIVE" || loan.status === "AT_RISK") && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-2 text-sm font-medium">
            {isCommunityMode ? "Make a repayment" : "Record repayment"}
          </div>
          <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-3">
            <span className="text-[var(--muted-foreground)]">M</span>
            <input
              value={repaymentAmount}
              onChange={(e) => setRepaymentAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="w-full bg-transparent text-lg font-medium outline-none"
            />
          </div>
          <Button
            className="h-11 w-full"
            disabled={repaymentMutation.isPending}
            onClick={handleRepayment}
          >
            {isCommunityMode ? "Pay" : "Record payment"}
          </Button>
        </Card>
      )}
    </div>
  );
}
