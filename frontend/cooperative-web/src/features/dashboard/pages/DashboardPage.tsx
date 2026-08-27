import { BriefcaseBusiness, HeartHandshake, Wallet } from "lucide-react";

import { NextActionCard } from "@/components/common/NextActionCard";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import { resolveDashboardNextAction } from "@/lib/domain/next-action";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { SetupChecklistCard } from "../components/SetupChecklistCard";
import { useDashboardSetupData } from "../hooks/useDashboardSetupData";

export function DashboardPage() {
  const { isCommunityMode } = useExperienceMode();
  const { navigateToApp } = useTenantNavigation();
  const setupData = useDashboardSetupData();

  if (setupData.isLoading) return <LoadingState />;

  if (setupData.isError) {
    return <ErrorState title="Could not load dashboard" />;
  }

  const schemeCount = getDashboardSchemeCount(setupData);

  const nextAction = resolveDashboardNextAction({
    schemeCount,
    isCommunityMode,
  });

  const recordPaymentButton = (
    <PermissionGate permissions={["payment:record"]}>
      <Button
        variant="outline"
        onClick={() => navigateToApp("/record-payment")}
      >
        <Wallet className="mr-2 size-4" />
        Record a payment
      </Button>
    </PermissionGate>
  );

  // Self-service — available to every role, since allocating your own
  // recorded payment shouldn't require any special staff permission.
  const myPaymentsButton = (
    <Button variant="outline" onClick={() => navigateToApp("/payments")}>
      <Wallet className="mr-2 size-4" />
      Your payments
    </Button>
  );

  const dashboardActions = (
    <div className="flex flex-wrap gap-2">
      {myPaymentsButton}
      {recordPaymentButton}
    </div>
  );

  if (isCommunityMode) {
    return (
      <div>
        <PageHeader
          title="Welcome back"
          description="Run your community fund, track people, and record money safely."
          actions={dashboardActions}
        />

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <DashboardHeroCard
            title="Community Mode"
            description="Simple workflows for ordinary group leaders and volunteer treasurers."
            icon={<HeartHandshake className="size-6" />}
          />
        </div>

        <div className="mb-6">
          <NextActionCard action={nextAction} />
        </div>

        <SetupChecklistCard checklist={setupData.checklist} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Finance Dashboard"
        description="Professional view for accounting, reporting, and financial controls."
        actions={dashboardActions}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <DashboardHeroCard
          title="Professional Mode"
          description="Access journals, accounts, reports, periods, and accounting controls."
          icon={<BriefcaseBusiness className="size-6" />}
        />
      </div>

      <NextActionCard action={nextAction} />
    </div>
  );
}

function DashboardHeroCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardContent className="flex gap-4 p-5">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)]">
          {icon}
        </div>

        <div>
          <p className="font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getDashboardSchemeCount(setupData: unknown) {
  const data = setupData as Record<string, unknown>;

  const directSchemeCount = readNumber(data.schemeCount);
  if (typeof directSchemeCount === "number") return directSchemeCount;

  const directSchemesCount = readNumber(data.schemesCount);
  if (typeof directSchemesCount === "number") return directSchemesCount;

  const totals = data.totals as Record<string, unknown> | undefined;
  const totalsSchemeCount = readNumber(totals?.schemeCount);
  if (typeof totalsSchemeCount === "number") return totalsSchemeCount;

  const counts = data.counts as Record<string, unknown> | undefined;
  const countsSchemeCount = readNumber(counts?.schemes);
  if (typeof countsSchemeCount === "number") return countsSchemeCount;

  const checklist = Array.isArray(data.checklist) ? data.checklist : [];

  const completedSchemeSetupItem = checklist.some((item) => {
    if (!item || typeof item !== "object") return false;

    const record = item as Record<string, unknown>;
    const label = `${record.id ?? ""} ${record.title ?? ""} ${
      record.label ?? ""
    }`.toLowerCase();

    const completed =
      record.completed === true ||
      record.isCompleted === true ||
      record.status === "completed";

    return completed && (label.includes("scheme") || label.includes("fund"));
  });

  return completedSchemeSetupItem ? 1 : 0;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return undefined;
}