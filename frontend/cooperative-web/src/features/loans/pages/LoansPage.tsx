import { HandCoins } from "lucide-react";
import { useParams } from "react-router";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { LoanCard } from "../components/LoanCard";
import { useSchemeLoans } from "../hooks/useSchemeLoans";

export function LoansPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const { navigateToApp } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();

  const loansQuery = useSchemeLoans(schemeId ?? "");

  if (!schemeId) return <ErrorState title="No scheme selected" />;
  if (loansQuery.isLoading) return <LoadingState />;
  if (loansQuery.isError) {
    return <ErrorState title={isCommunityMode ? "Could not load loans" : "Could not load loans"} />;
  }

  const loans = loansQuery.data ?? [];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-medium text-[var(--foreground)]">
            {isCommunityMode ? "Loans" : "Loans"}
          </div>
        </div>
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
        <div className="flex flex-col gap-3">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
      )}
    </div>
  );
}
