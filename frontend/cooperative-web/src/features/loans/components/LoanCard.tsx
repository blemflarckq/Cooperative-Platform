import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import type { Loan } from "../types/loan.types";

const STATUS_LABEL: Record<Loan["status"], string> = {
  PENDING_PLEDGES: "Waiting for your group to fund",
  PENDING_APPROVAL: "Waiting on approval",
  ACTIVE: "Active",
  AT_RISK: "Needs attention",
  REPAID: "Fully repaid",
};

export function LoanCard({ loan }: { loan: Loan }) {
  const { navigateToApp } = useTenantNavigation();
  const outstanding =
    Number(loan.selfFundedOutstandingPrincipal) + Number(loan.peerFundedOutstandingPrincipal);

  return (
    <button
      type="button"
      onClick={() => navigateToApp(`/loans/${loan.id}`)}
      className="w-full text-left"
    >
      <Card className="flex flex-row items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <div>
          <div className="text-sm font-medium text-[var(--foreground)]">
            {formatCurrency(loan.principalAmount)}
          </div>
          <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {STATUS_LABEL[loan.status]}
          </div>
          {loan.status === "ACTIVE" || loan.status === "AT_RISK" ? (
            <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {formatCurrency(outstanding)} still owed
            </div>
          ) : null}
        </div>
        <ChevronRight className="size-4 text-[var(--muted-foreground)]" />
      </Card>
    </button>
  );
}
