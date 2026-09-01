import { useState } from "react";
import { useParams } from "react-router";
import { ArrowLeft, AlertTriangle, PiggyBank, Users, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PermissionGate } from "@/components/common/PermissionGate";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { getLifecyclePresentation } from "@/lib/domain/lifecycle";
import { useAuth } from "@/lib/auth/AuthContext";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useLoan } from "../hooks/useLoan";
import { usePledgeToLoan } from "../hooks/usePledgeToLoan";
import { useDisburseLoan } from "../hooks/useDisburseLoan";
import { usePledgeCapacity } from "../hooks/usePledgeCapacity";
import { getLoanDisplayStatus, isReadyToDisburse } from "../utils/loan-display-status";

// A small, consistent set of accent tones so each pledger's segment reads
// as a distinct person at a glance without needing a legend.
const SEGMENT_TONES = ["var(--primary)", "var(--text-accent, var(--primary))"];

/**
 * Matches the approved "loan detail" mockup: the dual-tranche breakdown
 * stays legible for the life of the loan, not just at request time — each
 * tranche re-explains what it means, per the design language's rule for
 * multi-part mechanics.
 *
 * Every piece of copy on this page is viewer-aware — a third party
 * looking at someone else's loan (because they pledged, or because
 * they're a Treasurer) should never read language that implies the loan
 * is theirs.
 *
 * Repayment no longer happens here at all — it only happens through the
 * payment allocation flow now, so there's exactly one place money
 * actually moves, not two.
 */
export function LoanDetailPage() {
  const { loanId } = useParams<{ loanId: string }>();
  const { navigateToApp } = useTenantNavigation();
  const { user } = useAuth();
  const { isCommunityMode } = useExperienceMode();

  const loanQuery = useLoan(loanId ?? "");
  const pledgeMutation = usePledgeToLoan();
  const disburseMutation = useDisburseLoan();

  const [pledgeAmount, setPledgeAmount] = useState("");

  // Everything below must tolerate loanQuery.data being undefined —
  // usePledgeCapacity has to be called on EVERY render, in the same
  // position, regardless of loading state. Calling it after an early
  // return (as this used to) meant it fired on some renders and not
  // others, which is exactly the "order of Hooks changed" bug React was
  // reporting — not cosmetic, a real violation of the Rules of Hooks.
  const loan = loanQuery.data;
  const isBorrower = loan?.borrower?.user?.id === user?.id;
  const pledges = loan?.pledges ?? [];
  const alreadyPledgedByViewer = pledges.some(
    (pledge) => pledge.pledgingTenantUser?.user?.id === user?.id,
  );
  const canPledge =
    loan?.status === "PENDING_PLEDGES" && !isBorrower && !alreadyPledgedByViewer;

  const pledgeCapacityQuery = usePledgeCapacity(loan?.id ?? "", canPledge);

  if (!loanId) return <ErrorState title="No loan selected" />;
  if (loanQuery.isLoading) return <LoadingState />;
  if (loanQuery.isError || !loan) {
    return <ErrorState title="Could not load this loan" />;
  }

  const borrowerFirstName = loan.borrower?.user?.firstName ?? "This member";
  const borrowerPossessive = isBorrower ? "your" : `${borrowerFirstName}'s`;

  const totalPrincipal = Number(loan.principalAmount);
  const totalOutstandingPrincipal =
    Number(loan.selfFundedOutstandingPrincipal) + Number(loan.peerFundedOutstandingPrincipal);
  const totalPaid = totalPrincipal - totalOutstandingPrincipal;
  const paidPct = totalPrincipal > 0 ? Math.min(100, Math.round((totalPaid / totalPrincipal) * 100)) : 0;

  const peerTotal = Number(loan.peerFundedPrincipal);
  const alreadyPledged = pledges.reduce((sum, pledge) => sum + Number(pledge.pledgedAmount), 0);
  const stillNeeded = Math.max(0, peerTotal - alreadyPledged);

  async function handlePledge() {
    if (!loan || !pledgeAmount || Number(pledgeAmount) <= 0) return;
    if (Number(pledgeAmount) > stillNeeded) {
      toast.error(
        `You can pledge up to ${formatCurrency(stillNeeded)} — that's all that's still needed.`,
      );
      return;
    }
    try {
      await pledgeMutation.mutateAsync({ loanId: loan.id, pledgedAmount: pledgeAmount });
      toast.success(isCommunityMode ? "Thanks for helping fund this" : "Pledge recorded");
      setPledgeAmount("");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function handleDisburse() {
    if (!loan) return;
    try {
      await disburseMutation.mutateAsync(loan.id);
      toast.success(isCommunityMode ? "Money sent" : "Loan disbursed");
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
        {isBorrower
          ? isCommunityMode
            ? "Your loan"
            : "Loan detail"
          : `${borrowerFirstName}'s loan`}
      </button>

      {/* Hero status card */}
      <Card className="rounded-2xl border-0 bg-[var(--primary)] p-5 shadow-none ring-0">
        <div className="mb-1 text-xs text-white/80">
          {getLifecyclePresentation(getLoanDisplayStatus(loan)).label}
        </div>

        {loan.status === "ACTIVE" || loan.status === "AT_RISK" ? (
          <>
            <div className="mb-3 text-3xl font-medium text-white">
              {formatCurrency(totalOutstandingPrincipal)}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="mt-2 text-xs text-white/80">
              {formatCurrency(totalPaid)} paid back of {formatCurrency(totalPrincipal)}
            </div>
          </>
        ) : loan.status === "PENDING_PLEDGES" ? (
          <div className="text-2xl font-medium text-white">
            {formatCurrency(stillNeeded)} still needed
          </div>
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
              ? `This loan needs attention — no new loans for ${isBorrower ? "you" : borrowerFirstName} until it's fully repaid.`
              : "Flagged at-risk — the peer-funded rate reached its cap. New loans blocked until fully repaid."}
          </div>
        </Card>
      )}

      {Number(loan.selfFundedPrincipal) > 0 && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className="size-4 text-[var(--muted-foreground)]" />
              <span className="text-sm">
                {isBorrower ? "From your own savings" : `From ${borrowerFirstName}'s own savings`}
              </span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(loan.selfFundedOutstandingPrincipal)} left
            </span>
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {isBorrower
              ? "Grows your own balance as you repay"
              : `Grows ${borrowerFirstName}'s own balance as they repay`}
          </div>
        </Card>
      )}

      {/* Peer-funded card — the segmented bar tells the pledge story
          visually: one solid block per pledger (their initial inside it),
          then a dashed block for what's still open. No arithmetic needed
          to see who's covered what. */}
      {peerTotal > 0 && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[var(--muted-foreground)]" />
              <span className="text-sm">
                {isBorrower ? "From your group" : `From ${borrowerFirstName}'s group`}
              </span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(loan.peerFundedOutstandingPrincipal)} left
            </span>
          </div>

          {loan.status === "PENDING_PLEDGES" && (
            <div className="mb-2 flex h-9 overflow-hidden rounded-lg">
              {pledges.map((pledge, index) => (
                <div
                  key={pledge.id}
                  className="flex items-center justify-center"
                  style={{
                    width: `${(Number(pledge.pledgedAmount) / peerTotal) * 100}%`,
                    background: SEGMENT_TONES[index % SEGMENT_TONES.length],
                    opacity: index % 2 === 0 ? 1 : 0.6,
                  }}
                  title={`${pledge.pledgingTenantUser?.user?.firstName ?? "A member"} — ${formatCurrency(pledge.pledgedAmount)}`}
                >
                  <span className="text-[11px] font-medium text-white">
                    {pledge.pledgingTenantUser?.user?.firstName?.[0] ?? "?"}
                  </span>
                </div>
              ))}
              {stillNeeded > 0 && (
                <div
                  className="flex items-center justify-center border border-dashed border-[var(--border-strong,var(--border))] bg-[var(--secondary)]"
                  style={{ width: `${(stillNeeded / peerTotal) * 100}%` }}
                >
                  <Plus className="size-3.5 text-[var(--muted-foreground)]" />
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-[var(--muted-foreground)]">
            {pledges.length > 0
              ? `${formatCurrency(alreadyPledged)} pledged by ${pledges.length} member${pledges.length > 1 ? "s" : ""}${stillNeeded > 0 ? ` · ${formatCurrency(stillNeeded)} still needed` : ""}`
              : "Not yet funded"}
          </div>
        </Card>
      )}

      {/* Pledge action — only for non-borrowers, while still open, who haven't already pledged */}
      {canPledge && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-2 text-sm font-medium">
            {isCommunityMode ? `Help fund ${borrowerPossessive} loan` : "Pledge toward this loan"}
          </div>

          {pledgeCapacityQuery.data && (
            <div className="mb-3 rounded-xl bg-[var(--secondary)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
              You have{" "}
              <span className="font-medium text-[var(--foreground)]">
                {formatCurrency(pledgeCapacityQuery.data.availableAmount)}
              </span>{" "}
              available to pledge
            </div>
          )}

          <div className="mb-1.5 flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-3">
            <span className="text-[var(--muted-foreground)]">M</span>
            <input
              value={pledgeAmount}
              onChange={(e) => setPledgeAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              max={stillNeeded}
              className="w-full bg-transparent text-lg font-medium outline-none"
            />
          </div>
          <div className="mb-3 text-xs text-[var(--muted-foreground)]">
            Up to {formatCurrency(stillNeeded)} still needed
          </div>
          <Button className="h-11 w-full" disabled={pledgeMutation.isPending} onClick={handlePledge}>
            {isCommunityMode ? "Pledge" : "Submit pledge"}
          </Button>
        </Card>
      )}

      {/* Waiting-on-approval — informational only, no button, since one
          would just fail server-side until both approvals are actually
          in. Showing this instead of a broken-looking action is the
          direct fix for a status that used to look actionable when it
          wasn't. */}
      {loan.status === "PENDING_APPROVAL" && !isReadyToDisburse(loan) && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-1 text-sm font-medium">
            {isCommunityMode ? "Waiting on your group's approvers" : "Waiting on approval"}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {(() => {
              const approvedCount =
                loan.outboundRequest?.approvals?.filter((a) => a.decision === "APPROVED")
                  .length ?? 0;
              return `${approvedCount} of 2 approvals so far — nothing for you to do until then.`;
            })()}
          </div>
        </Card>
      )}

      {/* Disburse action — treasurer/committee only, and only once BOTH
          approvals are genuinely in. This used to show whenever
          loan.status was PENDING_APPROVAL, regardless of whether the
          approval was actually complete — meaning the button could be
          visible and clickable, but fail every time, until this fix. */}
      {isReadyToDisburse(loan) && (
        <PermissionGate permissions={["loan:disburse"]}>
          <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
            <div className="mb-2 text-sm font-medium">
              {isCommunityMode ? "Ready to send the money?" : "Disburse this loan"}
            </div>
            <div className="mb-3 text-xs text-[var(--muted-foreground)]">
              {isCommunityMode
                ? "Both approvers have signed off — you can release the funds now."
                : "Both approvals are in — this is ready to disburse."}
            </div>
            <Button className="h-11 w-full" disabled={disburseMutation.isPending} onClick={handleDisburse}>
              {isCommunityMode ? "Send the money" : "Disburse"}
            </Button>
          </Card>
        </PermissionGate>
      )}
    </div>
  );
}
