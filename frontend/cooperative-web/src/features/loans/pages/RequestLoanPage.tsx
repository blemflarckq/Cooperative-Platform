import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router";
import { ArrowLeft, Coins, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

import { useLoanSplitPreview } from "../hooks/useLoanSplitPreview";
import { useRequestLoan } from "../hooks/useRequestLoan";
import { requestLoanSchema, type RequestLoanFormValues } from "../schemas/loan.schema";

/**
 * Matches the approved "loan request form" mockup: a live breakdown of
 * self-funded vs. peer-funded appears as the member types, before they
 * ever submit — the platform's most distinctive mechanic made visible
 * without ever using the words "tranche" or "peer-funded" on this screen.
 */
export function RequestLoanPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const { navigateToApp } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const requestLoan = useRequestLoan();

  const form = useForm<RequestLoanFormValues>({
    resolver: zodResolver(requestLoanSchema),
    defaultValues: { amount: "", purpose: "" },
  });

  const amount = form.watch("amount");
  const debouncedAmount = useDebouncedValue(amount, 400);

  const previewQuery = useLoanSplitPreview(schemeId ?? "", debouncedAmount);
  const preview = previewQuery.data;

  async function onSubmit(values: RequestLoanFormValues) {
    if (!schemeId) return;

    try {
      await requestLoan.mutateAsync({ schemeId, payload: values });
      toast.success(
        isCommunityMode ? "Your request has been sent" : "Loan request submitted",
      );
      navigateToApp(`/schemes/${schemeId}/loans`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  const peerAmount = preview ? Number(preview.peerFundedPrincipal) : 0;
  const needsPeerFunding = peerAmount > 0;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5">
      <button
        type="button"
        onClick={() => navigateToApp(`/schemes/${schemeId}/loans`)}
        className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]"
      >
        <ArrowLeft className="size-5 text-[var(--muted-foreground)]" />
        {isCommunityMode ? "Request a loan" : "New loan request"}
      </button>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">
            {isCommunityMode ? "How much do you need?" : "Amount"}
          </label>
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border-strong,var(--border))] px-4 py-3">
            <span className="text-lg text-[var(--muted-foreground)]">M</span>
            <input
              {...form.register("amount")}
              inputMode="decimal"
              placeholder="0"
              className="w-full bg-transparent text-xl font-medium outline-none"
            />
          </div>
          {form.formState.errors.amount && (
            <p className="mt-1 text-xs text-[var(--destructive)]">
              {form.formState.errors.amount.message}
            </p>
          )}
        </div>

        {preview && (
          <Card className="rounded-2xl border-0 bg-[var(--secondary)] p-4 shadow-none ring-0">
            <div className="mb-2.5 text-xs text-[var(--foreground)]">
              Here's how this breaks down
            </div>

            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-[var(--foreground)]" />
                <span className="text-sm text-[var(--foreground)]">
                  From your own savings
                </span>
              </div>
              <span className="text-sm font-medium text-[var(--foreground)]">
                {formatCurrency(preview.selfFundedPrincipal)}
              </span>
            </div>

            {needsPeerFunding && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[var(--foreground)]" />
                  <span className="text-sm text-[var(--foreground)]">
                    Needs your group to fund
                  </span>
                </div>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {formatCurrency(preview.peerFundedPrincipal)}
                </span>
              </div>
            )}
          </Card>
        )}

        <div>
          <label className="mb-1.5 block text-sm text-[var(--muted-foreground)]">
            {isCommunityMode ? "What's it for?" : "Purpose"}
          </label>
          <Input
            {...form.register("purpose")}
            placeholder={isCommunityMode ? "School fees for this term" : "Purpose"}
          />
          {form.formState.errors.purpose && (
            <p className="mt-1 text-xs text-[var(--destructive)]">
              {form.formState.errors.purpose.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={requestLoan.isPending || !schemeId}
          className="h-12 w-full"
        >
          {isCommunityMode ? "Send request" : "Submit loan request"}
        </Button>

        {preview && (
          <p className="text-center text-xs text-[var(--muted-foreground)]">
            {needsPeerFunding
              ? `${formatCurrency(preview.selfFundedPrincipal)} is yours already, only ${formatCurrency(preview.peerFundedPrincipal)} needs approval`
              : "This is fully covered by your own savings"}
          </p>
        )}
      </form>
    </div>
  );
}
