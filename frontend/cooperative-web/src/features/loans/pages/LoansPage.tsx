import { ArrowLeft, HandCoins } from "lucide-react";
import { useParams } from "react-router";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { LoanCard } from "../components/LoanCard";
import { useSchemeLoans } from "../hooks/useSchemeLoans";

export function LoansPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const { navigateToApp } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const { user } = useAuth();

  const loansQuery = useSchemeLoans(schemeId ?? "");

  if (!schemeId) return <ErrorState title="No scheme selected" />;
  if (loansQuery.isLoading) return <LoadingState />;
  if (loansQuery.isError) {
    return <ErrorState title="Could not load loans" />;
  }

  const loans = loansQuery.data ?? [];
  const yourLoans = loans.filter((loan) => loan.borrower?.user?.id === user?.id);
  const otherLoans = loans.filter((loan) => loan.borrower?.user?.id !== user?.id);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <button
        type="button"
        onClick={() => navigateToApp(`/schemes/${schemeId}`)}
        className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]"
      >
        <ArrowLeft className="size-5 text-[var(--muted-foreground)]" />
        Loans
      </button>

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => navigateToApp(`/schemes/${schemeId}/loans/new`)}>
          {isCommunityMode ? "Request a loan" : "New request"}
        </Button>
      </div>

      {loans.length === 0 ? (
        <EmptyState
          title={isCommunityMode ? "No loans yet" : "No loans"}
          description={
            isCommunityMode
              ? "When you need help with something, your own savings and your group can cover it together."
              : "No loans have been requested in this scheme yet."
          }
          icon={<HandCoins className="size-5" />}
        />
      ) : (
        <>
          {yourLoans.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-medium text-[var(--muted-foreground)]">
                Your loans
              </div>
              {yourLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </div>
          )}

          {otherLoans.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-medium text-[var(--muted-foreground)]">
                {isCommunityMode ? "Your group's loans" : "Other members' loans"}
              </div>
              {otherLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
