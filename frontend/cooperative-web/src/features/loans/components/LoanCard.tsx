import { ChevronRight, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatCurrency } from "@/lib/formatting/currency";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import type { Loan } from "../types/loan.types";
import { getLoanDisplayStatus } from "../utils/loan-display-status";

const SEGMENT_TONES = ["var(--primary)", "var(--text-accent, var(--primary))"];

export function LoanCard({ loan }: { loan: Loan }) {
  const { navigateToApp } = useTenantNavigation();
  const { user } = useAuth();
  const isBorrower = loan.borrower?.user?.id === user?.id;
  const outstanding =
    Number(loan.selfFundedOutstandingPrincipal) + Number(loan.peerFundedOutstandingPrincipal);

  const peerTotal = Number(loan.peerFundedPrincipal);
  const pledges = loan.pledges ?? [];
  const alreadyPledged = pledges.reduce((sum, pledge) => sum + Number(pledge.pledgedAmount), 0);
  const stillNeeded = Math.max(0, peerTotal - alreadyPledged);
  const showWeighting = loan.status === "PENDING_PLEDGES" && peerTotal > 0;

  return (
    <button
      type="button"
      onClick={() => navigateToApp(`/loans/${loan.id}`)}
      className="w-full text-left"
    >
      <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <div className="flex flex-row items-start justify-between">
          <div>
            <div className="mb-0.5 flex items-center gap-1.5">
              <User className="size-3 text-[var(--muted-foreground)]" />
              <span className="text-xs text-[var(--muted-foreground)]">
                {isBorrower
                  ? "Your loan"
                  : `${loan.borrower?.user?.firstName ?? "Another member"}'s loan`}
              </span>
            </div>
            <div className="text-sm font-medium text-[var(--foreground)]">
              {formatCurrency(loan.principalAmount)}
            </div>
            {loan.status === "ACTIVE" || loan.status === "AT_RISK" ? (
              <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                {formatCurrency(outstanding)} still owed
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={getLoanDisplayStatus(loan)} />
            <ChevronRight className="size-4 text-[var(--muted-foreground)]" />
          </div>
        </div>

        {/* Same segmented pledge story as the detail page, compressed —
            one glance shows who's covered what without opening the loan. */}
        {showWeighting && (
          <div className="mt-3 flex h-2 overflow-hidden rounded-full">
            {pledges.map((pledge, index) => (
              <div
                key={pledge.id}
                style={{
                  width: `${(Number(pledge.pledgedAmount) / peerTotal) * 100}%`,
                  background: SEGMENT_TONES[index % SEGMENT_TONES.length],
                  opacity: index % 2 === 0 ? 1 : 0.6,
                }}
              />
            ))}
            {stillNeeded > 0 && (
              <div
                className="border-t border-b border-dashed border-[var(--border-strong,var(--border))]"
                style={{ width: `${(stillNeeded / peerTotal) * 100}%` }}
              />
            )}
          </div>
        )}
      </Card>
    </button>
  );
}
