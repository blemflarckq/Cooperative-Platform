import { CheckCircle2, ClipboardCheck, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { NextActionCard } from "@/components/common/NextActionCard";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PaginationFooter } from "@/components/data-display/PaginationFooter";
import { TableToolbar } from "@/components/data-display/TableToolbar";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveSchemeNextAction } from "@/lib/domain/next-action";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useCyclesByScheme } from "@/features/cycles/hooks/useCyclesByScheme";
import { useScheme } from "../hooks/useScheme";
import { useSchemeTransition } from "../hooks/useSchemeTransition";
import { getFundRuleSummary } from "../utils/get-fund-rule-summary";

const communityCycleStatusOptions = [
  { value: "DRAFT", label: "Not Started" },
  { value: "OPEN", label: "Collecting Money" },
  { value: "PAUSED", label: "Temporarily Paused" },
  { value: "CLOSED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const professionalCycleStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function SchemeDetailsPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const [cyclePage, setCyclePage] = useState(1);
  const [cycleSearch, setCycleSearch] = useState("");
  const [cycleStatus, setCycleStatus] = useState("");

  const schemeQuery = useScheme(schemeId!);
  const transitionMutation = useSchemeTransition();

  const cyclesQuery = useCyclesByScheme(schemeId!, {
    page: cyclePage,
    limit: 10,
    search: cycleSearch,
    status: cycleStatus,
  });

  const cycles = cyclesQuery.data?.data ?? [];
  const cyclesMeta = cyclesQuery.data?.meta;

  if (schemeQuery.isLoading) return <LoadingState />;

  if (schemeQuery.isError || !schemeQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load group fund"
            : "Could not load scheme"
        }
      />
    );
  }

  const scheme = schemeQuery.data;
  const latestCycle = cycles[0];

  const rules = getFundRuleSummary({
    cycleMode: scheme.cycleMode,
    contributionMode: scheme.contributionMode,
    loanMode: scheme.loanMode,
    payoutMode: scheme.payoutMode,
  });

  const cycleStatusOptions = isCommunityMode
    ? communityCycleStatusOptions
    : professionalCycleStatusOptions;

  const nextAction = resolveSchemeNextAction({
    schemeId: scheme.id,
    schemeStatus: scheme.status,
    cycleCount: cyclesMeta?.total ?? cycles.length,
    latestCycleId: latestCycle?.id,
    latestCycleStatus: latestCycle?.status,
    isCommunityMode,
  });

  const pageDescription = isCommunityMode
    ? "Review this fund, manage its activity periods, and keep your group moving together."
    : "Review scheme policy configuration and manage operating cycles.";

  const backLabel = isCommunityMode ? "Back to Group Funds" : "Back to Schemes";

  function handleActivate() {
    transitionMutation.mutate(
      { schemeId: scheme.id, transition: "activate" },
      {
        onSuccess: () =>
          toast.success(
            isCommunityMode ? "Group fund is ready to use" : "Scheme activated",
          ),
      },
    );
  }

  function handleSuspend() {
    transitionMutation.mutate(
      { schemeId: scheme.id, transition: "suspend" },
      {
        onSuccess: () =>
          toast.success(
            isCommunityMode ? "Group fund suspended" : "Scheme suspended",
          ),
      },
    );
  }

  function handleArchive() {
    transitionMutation.mutate(
      { schemeId: scheme.id, transition: "archive" },
      {
        onSuccess: () =>
          toast.success(
            isCommunityMode ? "Group fund archived" : "Scheme archived",
          ),
      },
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          {
            label: isCommunityMode ? t.terms("scheme") : "Schemes",
            to: "/schemes",
          },
          { label: scheme.name },
        ]}
      />

      <PageHeader
        title={scheme.name}
        description={pageDescription}
        backTo="/schemes"
        backLabel={backLabel}
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permissions={["outbound-request:read"]}>
              <Button
                variant="outline"
                onClick={() => navigate(appPath(`/schemes/${scheme.id}/approvals`))}
              >
                <ClipboardCheck className="mr-2 size-4" />
                {isCommunityMode ? "Waiting on you" : "Approvals"}
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["scheme:update"]}>
              <Button
                variant="outline"
                onClick={() => navigate(appPath(`/schemes/${scheme.id}/edit`))}
              >
                <Pencil className="mr-2 size-4" />
                {isCommunityMode ? "Edit Fund" : "Edit"}
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["scheme:activate"]}>
              <Button
                onClick={handleActivate}
                disabled={
                  scheme.status !== "DRAFT" || transitionMutation.isPending
                }
              >
                <CheckCircle2 className="mr-2 size-4" />
                {isCommunityMode ? "Activate Fund" : "Activate"}
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["cycle:create"]}>
              <Button
                variant="outline"
                disabled={scheme.status !== "ACTIVE"}
                onClick={() =>
                  navigate(appPath(`/schemes/${scheme.id}/cycles/new`))
                }
              >
                <Plus className="mr-2 size-4" />
                {isCommunityMode ? "Create Activity Period" : "Create Cycle"}
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["scheme:suspend"]}>
              <ConfirmActionDialog
                title={
                  isCommunityMode
                    ? "Suspend group fund?"
                    : "Suspend scheme?"
                }
                description={
                  isCommunityMode
                    ? "This will pause new activity for this group fund."
                    : "This will suspend the scheme and may prevent new operational activity."
                }
                confirmLabel={
                  isCommunityMode ? "Suspend Group Fund" : "Suspend Scheme"
                }
                onConfirm={handleSuspend}
                trigger={
                  <Button
                    variant="outline"
                    disabled={
                      scheme.status !== "ACTIVE" ||
                      transitionMutation.isPending
                    }
                    className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    {isCommunityMode ? "Suspend Fund" : "Suspend"}
                  </Button>
                }
              />
            </PermissionGate>

            <PermissionGate permissions={["scheme:archive"]}>
              <ConfirmActionDialog
                title={
                  isCommunityMode ? "Archive group fund?" : "Archive scheme?"
                }
                description={
                  isCommunityMode
                    ? "This will archive the group fund and hide it from normal active work."
                    : "This will archive the scheme and may prevent new operational activity."
                }
                confirmLabel={
                  isCommunityMode ? "Archive Group Fund" : "Archive Scheme"
                }
                onConfirm={handleArchive}
                trigger={
                  <Button
                    variant="outline"
                    disabled={
                      scheme.status !== "ACTIVE" ||
                      transitionMutation.isPending
                    }
                    className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    {isCommunityMode ? "Archive Fund" : "Archive"}
                  </Button>
                }
              />
            </PermissionGate>
          </div>
        }
      />

      <div className="mb-6">
        <NextActionCard
          action={nextAction}
          onAction={
            nextAction.kind === "activate_scheme" ? handleActivate : undefined
          }
          disabled={
            nextAction.kind === "activate_scheme" &&
            (scheme.status !== "DRAFT" || transitionMutation.isPending)
          }
        />
      </div>

      {isCommunityMode ? (
        <CommunitySchemeDetails
          scheme={scheme}
          rules={rules}
          cycleCount={cyclesMeta?.total ?? cycles.length}
        />
      ) : (
        <ProfessionalSchemeDetails scheme={scheme} />
      )}

      <div className="mt-6">
        <Card className="overflow-hidden border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                {isCommunityMode ? t.terms("cycle") : "Operating Cycles"}
              </CardTitle>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {isCommunityMode
                  ? "Manage activity periods created under this group fund."
                  : "Manage cycles created under this scheme."}
              </p>
            </div>

            <PermissionGate permissions={["cycle:create"]}>
              <Button
                variant="outline"
                disabled={scheme.status !== "ACTIVE"}
                onClick={() =>
                  navigate(appPath(`/schemes/${scheme.id}/cycles/new`))
                }
              >
                <Plus className="mr-2 size-4" />
                {isCommunityMode ? "Create Activity Period" : "Create Cycle"}
              </Button>
            </PermissionGate>
          </CardHeader>

          <TableToolbar
            searchValue={cycleSearch}
            onSearchChange={(value) => {
              setCycleSearch(value);
              setCyclePage(1);
            }}
            searchPlaceholder={
              isCommunityMode
                ? "Search activity periods by name or code..."
                : "Search cycles by name or code..."
            }
            filters={
              <Select
                value={cycleStatus || "all"}
                onValueChange={(value) => {
                  setCycleStatus(value === "all" ? "" : value);
                  setCyclePage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>

                  {cycleStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />

          <CardContent className="p-0">
            {cyclesQuery.isLoading ? (
              <div className="p-6">
                <LoadingState />
              </div>
            ) : cyclesQuery.isError ? (
              <div className="p-6">
                <ErrorState
                  title={
                    isCommunityMode
                      ? "Could not load activity periods"
                      : "Could not load cycles"
                  }
                />
              </div>
            ) : cycles.length === 0 ? (
              <div className="p-6 text-sm text-[var(--muted-foreground)]">
                {isCommunityMode
                  ? "No activity periods match the current filters."
                  : "No operating cycles match the current filters."}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {cycles.map((cycle) => (
                  <button
                    key={cycle.id}
                    type="button"
                    onClick={() => navigate(appPath(`/cycles/${cycle.id}`))}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-[var(--secondary)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">
                        {cycle.name}
                      </p>

                      <p className="truncate text-sm text-[var(--muted-foreground)]">
                        {cycle.code}
                      </p>
                    </div>

                    <StatusBadge status={cycle.status} />
                  </button>
                ))}
              </div>
            )}

            {cyclesMeta ? (
              <PaginationFooter meta={cyclesMeta} onPageChange={setCyclePage} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CommunitySchemeDetails({
  scheme,
  rules,
  cycleCount,
}: {
  scheme: {
    code: string;
    status: string;
    description?: string | null;
  };
  rules: Array<{
    id: string;
    text: string;
  }>;
  cycleCount: number;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>Fund Overview</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <Detail label="Fund Code" value={scheme.code} />
          <Detail label="Status" value={<StatusBadge status={scheme.status} />} />
          <Detail label="Activity Periods" value={cycleCount} />
          <Detail
            label="Description"
            value={scheme.description || "No description provided."}
          />
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>How this fund works</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {rules.map((rule) => (
            <Detail
              key={rule.id}
              label={getRuleLabel(rule.id)}
              value={rule.text}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function getRuleLabel(ruleId: string) {
  switch (ruleId) {
    case "cycleMode":
      return "Activity Period";
    case "contributionMode":
      return "Money Collection";
    case "loanMode":
      return "Loans";
    case "payoutMode":
      return "Payouts";
    default:
      return "Rule";
  }
}

function ProfessionalSchemeDetails({
  scheme,
}: {
  scheme: {
    code: string;
    status: string;
    cycleMode: string;
    contributionMode: string;
    loanMode: string;
    payoutMode: string;
    description?: string | null;
  };
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>Scheme Details</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <Detail label="Code" value={scheme.code} />
          <Detail label="Status" value={<StatusBadge status={scheme.status} />} />
          <Detail label="Cycle Mode" value={scheme.cycleMode} />
          <Detail label="Contribution Mode" value={scheme.contributionMode} />
          <Detail label="Loan Mode" value={scheme.loanMode} />
          <Detail label="Payout Mode" value={scheme.payoutMode} />
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>

        <CardContent className="text-sm text-[var(--muted-foreground)]">
          {scheme.description || "No description provided."}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>

      <div className="mt-1 text-sm font-medium text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}