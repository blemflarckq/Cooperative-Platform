import {
  Pause,
  Play,
  Plus,
  ReceiptText,
  StopCircle,
  XCircle,
} from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleParticipantsPanel } from "@/features/cycle-participants/components/CycleParticipantsPanel";
import { CycleContributionsPanel } from "@/features/contributions/components/CycleContributionsPanel";
import { CycleSavingsSummaryPanel } from "@/features/reports/components/CycleSavingsSummaryPanel";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useCycle } from "../hooks/useCycle";
import { useCycleTransition } from "../hooks/useCycleTransition";

import { NextActionCard } from "@/components/common/NextActionCard";
import { resolveCycleNextAction } from "@/lib/domain/next-action";

export function CycleDetailsPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { navigateToApp } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const cycleQuery = useCycle(cycleId!);
  const transitionMutation = useCycleTransition();

  if (cycleQuery.isLoading) return <LoadingState />;

  if (cycleQuery.isError || !cycleQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load activity period"
            : "Could not load cycle"
        }
      />
    );
  }

  const cycle = cycleQuery.data;

  const cycleLabel = isCommunityMode ? t.term("cycle") : "Operating Cycle";
  const schemeLabel = isCommunityMode ? t.term("scheme") : "Scheme";
  const membersLabel = isCommunityMode ? t.terms("participant") : "Participants";
  /*const moneyReceivedLabel = isCommunityMode
    ? t.term("contribution")
    : "Contribution";
*/
  const nextAction = resolveCycleNextAction({
    cycleId: cycle.id,
    cycleStatus: cycle.status,
    isCommunityMode,
  });

  function runTransition(transition: "open" | "pause" | "close" | "cancel") {
    transitionMutation.mutate(
      { cycleId: cycle.id, transition },
      {
        onSuccess: () =>
          toast.success(
            isCommunityMode
              ? `${cycleLabel} status updated`
              : "Cycle status updated",
          ),
      },
    );
  }

  function handleNextAction() {
    if (nextAction.kind === "open_cycle") {
      runTransition("open");
      return;
    }

    if (nextAction.to) {
      navigateToApp(nextAction.to);
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          {
            label: isCommunityMode ? t.terms("scheme") : "Schemes",
            to: "/schemes",
          },
          {
            label: schemeLabel,
            to: `/schemes/${cycle.schemeId}`,
          },
          {
            label: cycle.name,
          },
        ]}
      />

      <PageHeader
        title={cycle.name}
        description={
          isCommunityMode
            ? "Manage this activity period, its members, money received, and savings summary."
            : "Manage this operating cycle, its lifecycle state, participants, contributions, and reports."
        }
        backTo={`/schemes/${cycle.schemeId}`}
        backLabel={
          isCommunityMode ? `Back to ${t.term("scheme")}` : "Back to Scheme"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permissions={["cycle_participant:add"]}>
              <Button
                variant="outline"
                disabled={!["DRAFT", "OPEN"].includes(cycle.status)}
                onClick={() =>
                  navigateToApp(`/cycles/${cycle.id}/participants/new`)
                }
              >
                <Plus className="mr-2 size-4" />
                {isCommunityMode ? "Add Member" : "Add Participant"}
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["contribution:create"]}>
              <Button
                disabled={cycle.status !== "OPEN"}
                onClick={() =>
                  navigateToApp(`/cycles/${cycle.id}/contributions/new`)
                }
              >
                <ReceiptText className="mr-2 size-4" />
                {isCommunityMode ? "Record Money Received" : "Record Contribution"}
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["cycle:open"]}>
              <Button
                disabled={
                  !["DRAFT", "PAUSED"].includes(cycle.status) ||
                  transitionMutation.isPending
                }
                onClick={() => runTransition("open")}
                className="border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Play className="mr-2 size-4" />
                {isCommunityMode ? "Start Collecting" : "Open"}
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["cycle:pause"]}>
              <Button
                variant="outline"
                disabled={
                  cycle.status !== "OPEN" || transitionMutation.isPending
                }
                onClick={() => runTransition("pause")}
                className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                <Pause className="mr-2 size-4" />
                {isCommunityMode ? "Pause Activity" : "Pause"}
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["cycle:close"]}>
              <ConfirmActionDialog
                title={
                  isCommunityMode
                    ? "Complete this activity period?"
                    : "Close cycle?"
                }
                description={
                  isCommunityMode
                    ? "This is a serious financial action. Once completed, this activity period should no longer accept new members or money received."
                    : "Closing this cycle is a serious financial lifecycle action. Once closed, the cycle cannot be updated and participant enrollment should stop."
                }
                confirmLabel={
                  isCommunityMode ? "Complete Activity Period" : "Close Cycle"
                }
                loadingLabel={
                  isCommunityMode ? "Completing..." : "Closing..."
                }
                isLoading={transitionMutation.isPending}
                disabled={
                  !["OPEN", "PAUSED"].includes(cycle.status) ||
                  transitionMutation.isPending
                }
                onConfirm={() => runTransition("close")}
                trigger={
                  <Button
                    variant="outline"
                    disabled={
                      !["OPEN", "PAUSED"].includes(cycle.status) ||
                      transitionMutation.isPending
                    }
                    className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <StopCircle className="mr-2 size-4" />
                    {transitionMutation.isPending
                      ? "Updating..."
                      : isCommunityMode
                        ? "Complete"
                        : "Close"}
                  </Button>
                }
              />
            </PermissionGate>

            <PermissionGate permissions={["cycle:cancel"]}>
              <ConfirmActionDialog
                title={
                  isCommunityMode
                    ? "Cancel this activity period?"
                    : "Cancel cycle?"
                }
                description={
                  isCommunityMode
                    ? "Cancelling this activity period will stop it before it becomes operational. This should only be done if it was created in error or should no longer proceed."
                    : "Cancelling this cycle will stop it before it becomes operational. This should only be done when the cycle was created in error or should no longer proceed."
                }
                confirmLabel={
                  isCommunityMode ? "Cancel Activity Period" : "Cancel Cycle"
                }
                loadingLabel="Cancelling..."
                variant="destructive"
                isLoading={transitionMutation.isPending}
                disabled={
                  cycle.status !== "DRAFT" || transitionMutation.isPending
                }
                onConfirm={() => runTransition("cancel")}
                trigger={
                  <Button
                    variant="destructive"
                    disabled={
                      cycle.status !== "DRAFT" ||
                      transitionMutation.isPending
                    }
                  >
                    <XCircle className="mr-2 size-4" />
                    {transitionMutation.isPending ? "Updating..." : "Cancel"}
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
            nextAction.kind === "open_cycle" ? handleNextAction : undefined
          }
          disabled={
            nextAction.kind === "open_cycle" && transitionMutation.isPending
          }
        />
      </div>
      
      {transitionMutation.isPending ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {isCommunityMode
            ? "Updating activity period status..."
            : "Updating cycle status..."}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>
              {isCommunityMode ? "Activity Period Overview" : "Cycle Details"}
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-5 md:grid-cols-2">
            <Detail
              label={isCommunityMode ? "Activity Code" : "Code"}
              value={cycle.code}
            />

            <Detail
              label={isCommunityMode ? "Activity Status" : "Status"}
              value={<StatusBadge status={cycle.status} />}
            />

            <Detail
              label={isCommunityMode ? "Start Date" : "Start Date"}
              value={formatDate(cycle.startsOn) ?? "Not set"}
            />

            <Detail
              label={isCommunityMode ? "End Date" : "End Date"}
              value={formatDate(cycle.endsOn) ?? "Not set"}
            />

            <Detail
              label={isCommunityMode ? "Target Amount" : "Target Amount"}
              value={formatCurrency(cycle.targetAmount) ?? "Not applicable"}
            />

            <Detail
              label="Created"
              value={formatDate(cycle.createdAt) ?? "Not set"}
            />
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>
              {isCommunityMode ? "What You Can Do Now" : "Lifecycle Rules"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            {isCommunityMode ? (
              <CommunityNextSteps cycleStatus={cycle.status} />
            ) : (
              <>
                <p>DRAFT cycles can be opened or cancelled.</p>
                <p>OPEN cycles can be paused or closed.</p>
                <p>PAUSED cycles can be reopened or closed.</p>
                <p>Closed or cancelled cycles cannot be updated.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <SectionIntro
          title={membersLabel}
          description={
            isCommunityMode
              ? "People who are part of this activity period."
              : "Participants enrolled in this operating cycle."
          }
        />

        <CycleParticipantsPanel cycleId={cycle.id} />
      </div>

      <div className="mt-6">
        <SectionIntro
          title={isCommunityMode ? "Money Received" : "Contributions"}
          description={
            isCommunityMode
              ? "Money recorded from members during this activity period."
              : "Contributions posted against this operating cycle."
          }
        />

        <CycleContributionsPanel
          cycleId={cycle.id}
          cycleStatus={cycle.status}
        />
      </div>

      <div className="mt-6">
        <SectionIntro
          title={isCommunityMode ? "Fund Savings Summary" : "Savings Summary"}
          description={
            isCommunityMode
              ? "A summary of what has been saved or collected in this activity period."
              : "Accounting summary of savings for this cycle."
          }
        />

        <CycleSavingsSummaryPanel cycleId={cycle.id} />
      </div>
    </div>
  );
}

function CommunityNextSteps({ cycleStatus }: { cycleStatus: string }) {
  if (cycleStatus === "DRAFT") {
    return (
      <>
        <p>This activity period has not started yet.</p>
        <p>Start collecting when your group is ready to add members and record money.</p>
        <p>You can still cancel it if it was created by mistake.</p>
      </>
    );
  }

  if (cycleStatus === "OPEN") {
    return (
      <>
        <p>This activity period is collecting money.</p>
        <p>You can add members and record money received.</p>
        <p>Pause or complete it when the group is ready.</p>
      </>
    );
  }

  if (cycleStatus === "PAUSED") {
    return (
      <>
        <p>This activity period is temporarily paused.</p>
        <p>You can start collecting again or complete the activity period.</p>
      </>
    );
  }

  if (cycleStatus === "CLOSED") {
    return (
      <>
        <p>This activity period is completed.</p>
        <p>Records are kept for reporting and history.</p>
      </>
    );
  }

  if (cycleStatus === "CANCELLED") {
    return (
      <>
        <p>This activity period was cancelled.</p>
        <p>It should not be used for new money or members.</p>
      </>
    );
  }

  return <p>Review this activity period and choose the next action.</p>;
}

function SectionIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">
        {title}
      </h2>

      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        {description}
      </p>
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