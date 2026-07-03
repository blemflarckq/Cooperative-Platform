import { useMemo } from "react";
import { useSchemes } from "@/features/schemes/hooks/useSchemes";
import { useAccountingSettings } from "@/features/accounting/hooks/useAccountingSettings";
import { buildSetupChecklist } from "../utils/build-setup-checklist";

export function useDashboardSetupData() {
  const schemesQuery = useSchemes({
    page: 1,
    limit: 5,
  });

  const settingsQuery = useAccountingSettings();

  const schemes = schemesQuery.data?.data ?? [];

  const hasScheme = schemes.length > 0;
  const hasActiveCycle = schemes.some((scheme) => scheme.status === "ACTIVE");

  const settings = settingsQuery.data;

  const accountingConfigured = Boolean(
    settings?.cashAccountId &&
      settings.memberSavingsLiabilityAccountId &&
      settings.loanReceivableAccountId &&
      settings.interestIncomeAccountId &&
      settings.penaltyIncomeAccountId,
  );

  const checklist = useMemo(
    () =>
      buildSetupChecklist({
        hasScheme,
        hasActiveCycle,
        hasParticipants: false,
        accountingConfigured,
        hasContributions: false,
      }),
    [hasScheme, hasActiveCycle, accountingConfigured],
  );

  return {
    isLoading: schemesQuery.isLoading || settingsQuery.isLoading,
    isError: schemesQuery.isError || settingsQuery.isError,
    checklist,
  };
}