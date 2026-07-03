import { RotateCcw, UserX, XCircle } from "lucide-react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
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
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";

import { getCycleParticipantById } from "../api/cycle-participants.api";
import { cycleParticipantQueryKeys } from "../hooks/cycle-participant-query-keys";
import { useCycleParticipantTransition } from "../hooks/useCycleParticipantTransition";

export function CycleParticipantDetailsPage() {
  const { participantId } = useParams<{ participantId: string }>();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const participantQuery = useQuery({
    queryKey: cycleParticipantQueryKeys.detail(participantId!),
    queryFn: () => getCycleParticipantById(participantId!),
    enabled: Boolean(participantId),
  });

  const transitionMutation = useCycleParticipantTransition();

  if (participantQuery.isLoading) return <LoadingState />;

  if (participantQuery.isError || !participantQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode ? "Could not load member" : "Could not load participant"
        }
      />
    );
  }

  const participant = participantQuery.data;
  const user = participant.tenantUser?.user;

  const personLabel = isCommunityMode ? "Member" : "Participant";
  const personLabelLower = personLabel.toLowerCase();
  const cycleLabel = isCommunityMode ? t.term("cycle") : "Cycle";

  const fullName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : isCommunityMode
      ? "Unknown member"
      : "Unknown participant";

  function runTransition(
    transition: "suspend" | "reactivate" | "exit" | "remove",
  ) {
    transitionMutation.mutate(
      {
        participantId: participant.id,
        transition,
      },
      {
        onSuccess: () =>
          toast.success(
            isCommunityMode
              ? "Member status updated"
              : "Participant status updated",
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
          {
            label: cycleLabel,
            to: `/cycles/${participant.cycleId}`,
          },
          {
            label: fullName,
          },
        ]}
      />

      <PageHeader
        title={fullName}
        description={
          isCommunityMode
            ? "Manage this member’s status inside the activity period."
            : "Manage this participant’s status inside the operating cycle."
        }
        backTo={`/cycles/${participant.cycleId}`}
        backLabel={
          isCommunityMode
            ? `Back to ${t.term("cycle")}`
            : "Back to Cycle"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permissions={["cycle_participant:suspend"]}>
              <ConfirmActionDialog
                title={
                  isCommunityMode
                    ? "Temporarily suspend this member?"
                    : "Suspend participant?"
                }
                description={
                  isCommunityMode
                    ? "This will temporarily suspend the member from this activity period. They will no longer be treated as actively participating until reactivated."
                    : "This will mark the participant as suspended from the cycle. They will no longer be treated as an active participant in this operating cycle."
                }
                confirmLabel={
                  isCommunityMode ? "Suspend Member" : "Suspend Participant"
                }
                variant="default"
                disabled={
                  participant.status !== "ACTIVE" ||
                  transitionMutation.isPending
                }
                onConfirm={() => runTransition("suspend")}
                trigger={
                  <Button
                    variant="outline"
                    disabled={
                      participant.status !== "ACTIVE" ||
                      transitionMutation.isPending
                    }
                    className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    <UserX className="mr-2 size-4" />
                    Suspend
                  </Button>
                }
              />
            </PermissionGate>

            <PermissionGate permissions={["cycle_participant:reactivate"]}>
              <Button
                variant="outline"
                disabled={
                  participant.status !== "SUSPENDED" ||
                  transitionMutation.isPending
                }
                onClick={() => runTransition("reactivate")}
              >
                <RotateCcw className="mr-2 size-4" />
                Reactivate
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["cycle_participant:exit"]}>
              <ConfirmActionDialog
                title={
                  isCommunityMode
                    ? "Mark this member as having left?"
                    : "Mark participant as exited?"
                }
                description={
                  isCommunityMode
                    ? "This records that the member has left this activity period. They will no longer be treated as active in this fund activity."
                    : "This will mark the participant as exited from the cycle. They will no longer be treated as an active participant in this operating cycle."
                }
                confirmLabel={
                  isCommunityMode ? "Mark as Left" : "Exit Participant"
                }
                variant="default"
                disabled={
                  !["ACTIVE", "SUSPENDED"].includes(participant.status) ||
                  transitionMutation.isPending
                }
                onConfirm={() => runTransition("exit")}
                trigger={
                  <Button
                    variant="outline"
                    disabled={
                      !["ACTIVE", "SUSPENDED"].includes(participant.status) ||
                      transitionMutation.isPending
                    }
                    className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <UserX className="mr-2 size-4" />
                    {isCommunityMode ? "Mark as Left" : "Exit"}
                  </Button>
                }
              />
            </PermissionGate>

            <PermissionGate permissions={["cycle_participant:remove"]}>
              <ConfirmActionDialog
                title={
                  isCommunityMode ? "Remove this member?" : "Remove participant?"
                }
                description={
                  isCommunityMode
                    ? "Removing this member is a serious administrative action. Use this only when the member was added incorrectly or should be removed from this activity period record."
                    : "Removing this participant is a serious administrative action. Use this only when the participant was enrolled incorrectly or should be removed from this cycle record."
                }
                confirmLabel={
                  isCommunityMode ? "Remove Member" : "Remove Participant"
                }
                variant="destructive"
                disabled={
                  !["ACTIVE", "SUSPENDED"].includes(participant.status) ||
                  transitionMutation.isPending
                }
                onConfirm={() => runTransition("remove")}
                trigger={
                  <Button
                    variant="destructive"
                    disabled={
                      !["ACTIVE", "SUSPENDED"].includes(participant.status) ||
                      transitionMutation.isPending
                    }
                  >
                    <XCircle className="mr-2 size-4" />
                    Remove
                  </Button>
                }
              />
            </PermissionGate>
          </div>
        }
      />

      {transitionMutation.isPending ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {isCommunityMode
            ? "Updating member status..."
            : "Updating participant status..."}
        </div>
      ) : null}

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>
            {isCommunityMode ? "Member Details" : "Participant Details"}
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <Detail label="Name" value={fullName} />
          <Detail label="Email" value={user?.email ?? "No email"} />
          <Detail
            label={isCommunityMode ? "Member Status" : "Status"}
            value={<StatusBadge status={participant.status} />}
          />

          <Detail
            label={isCommunityMode ? "Person Record ID" : "Tenant User ID"}
            value={participant.tenantUserId}
          />

          <Detail
            label={isCommunityMode ? "Joined" : "Joined"}
            value={participant.joinedAt ?? participant.createdAt}
          />

          <Detail
            label={isCommunityMode ? "Left" : "Exited"}
            value={
              participant.exitedAt ??
              (isCommunityMode ? "Has not left" : "Not exited")
            }
          />
        </CardContent>
      </Card>

      {isCommunityMode ? (
        <Card className="mt-6 border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>What this means</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>
              This person is part of the selected activity period for this group
              fund.
            </p>
            <p>
              Suspending pauses their participation temporarily. Marking them as
              left records that they are no longer participating.
            </p>
            <p>
              Removing should only be used when the {personLabelLower} was added
              incorrectly.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>

      <div className="mt-1 break-words text-sm font-medium text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}