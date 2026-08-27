import { ArrowLeft, ChevronRight, Wallet } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useCurrentTenantUser } from "@/features/tenant-users/hooks/useCurrentTenantUser";
import { useUnallocatedPayments } from "../hooks/useUnallocatedPayments";

/**
 * Step 2's entry point — what a member sees when they log in with money
 * waiting to be allocated. This is the PRIMARY path; staff assisting
 * someone else is a separate, secondary flow, not this screen.
 */
export function MyPaymentsPage() {
  const { navigateToApp } = useTenantNavigation();
  const currentUser = useCurrentTenantUser();
  const paymentsQuery = useUnallocatedPayments(currentUser.data?.id ?? "");

  if (currentUser.isLoading || paymentsQuery.isLoading) return <LoadingState />;
  if (currentUser.isError || paymentsQuery.isError) {
    return <ErrorState title="Could not load your payments" />;
  }

  const payments = paymentsQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <button
        type="button"
        onClick={() => navigateToApp("/")}
        className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]"
      >
        <ArrowLeft className="size-5 text-[var(--muted-foreground)]" />
        Your payments
      </button>

      {payments.length === 0 ? (
        <EmptyState
          title="Nothing waiting"
          description="When a payment is recorded for you, it will show up here so you can decide where it goes."
          icon={<Wallet className="size-5" />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((payment) => (
            <button
              key={payment.id}
              type="button"
              onClick={() => navigateToApp(`/allocate-payment/${payment.id}`)}
              className="w-full text-left"
            >
              <Card className="flex flex-row items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
                <div>
                  <div className="text-sm font-medium">{formatCurrency(payment.amount)}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                    Waiting for you to allocate
                  </div>
                </div>
                <ChevronRight className="size-4 text-[var(--muted-foreground)]" />
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
