import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { TenantUserListItem } from "@/features/tenant-users/types/tenant-user.types";

import { useTenantUserSearch } from "../hooks/useTenantUserSearch";
import { useRecordPayment } from "../hooks/useRecordPayment";

/**
 * Step 1 only — staff capture that money arrived. Deliberately does NOT
 * ask where it should go; that's the payer's own decision to make when
 * they next log in (or staff can assist separately, from a different,
 * secondary entry point — never this one).
 */
export function RecordPaymentPage() {
  const { navigateToApp } = useTenantNavigation();
  const recordMutation = useRecordPayment();

  const [payerQuery, setPayerQuery] = useState("");
  const debouncedPayerQuery = useDebouncedValue(payerQuery, 300);
  const [selectedPayer, setSelectedPayer] = useState<TenantUserListItem | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const searchQuery = useTenantUserSearch(debouncedPayerQuery);

  async function handleSubmit() {
    if (!selectedPayer || !amount || Number(amount) <= 0) return;

    try {
      await recordMutation.mutateAsync({
        tenantUserId: selectedPayer.id,
        amount,
        notes: notes.trim() || undefined,
      });
      toast.success(`Payment recorded for ${selectedPayer.firstName}`);
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
                  onClick={() => setSelectedPayer(person)}
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
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--muted-foreground)]">Payment from</div>
              <div className="text-base font-medium">
                {selectedPayer.firstName} {selectedPayer.lastName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPayer(null)}
              className="text-xs text-[var(--muted-foreground)] underline"
            >
              Change
            </button>
          </div>

          <Card className="rounded-2xl border-0 bg-[var(--primary)] p-4 shadow-none ring-0">
            <div className="mb-1 text-xs text-white/80">Amount received</div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl text-white/80">M</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                autoFocus
                className="w-full bg-transparent text-3xl font-medium text-white outline-none placeholder:text-white/40"
              />
            </div>
          </Card>

          <div>
            <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">
              Note (optional)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Mobile money, phone ending 1234"
              className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="text-xs text-[var(--muted-foreground)]">
            {selectedPayer.firstName} will decide where this goes next time they log
            in — this step only records that it arrived.
          </div>

          <Button
            className="h-12 w-full"
            disabled={!amount || Number(amount) <= 0 || recordMutation.isPending}
            onClick={handleSubmit}
          >
            Record payment
          </Button>
        </>
      )}
    </div>
  );
}
