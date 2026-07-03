import { useNavigate } from "react-router";
import { Plus, Users } from "lucide-react";

import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useCycleParticipants } from "../hooks/useCycleParticipants";

interface CycleParticipantsPanelProps {
  cycleId: string;
}

export function CycleParticipantsPanel({ cycleId }: CycleParticipantsPanelProps) {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const participantsQuery = useCycleParticipants(cycleId);

  const memberLabel = isCommunityMode ? t.term("participant") : "Participant";
  const membersLabel = isCommunityMode ? t.terms("participant") : "Participants";
  const cycleLabel = isCommunityMode ? t.term("cycle") : "Operating Cycle";

  if (participantsQuery.isLoading) return <LoadingState />;

  if (participantsQuery.isError) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load members"
            : "Could not load participants"
        }
      />
    );
  }

  const participants = participantsQuery.data?.data ?? [];

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{membersLabel}</CardTitle>

          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {isCommunityMode
              ? `People who are part of this ${cycleLabel.toLowerCase()}.`
              : "Participants enrolled in this operating cycle."}
          </p>
        </div>

        <PermissionGate permissions={["cycle_participant:add"]}>
          <Button
            variant="outline"
            onClick={() =>
              navigate(appPath(`/cycles/${cycleId}/participants/new`))
            }
          >
            <Plus className="mr-2 size-4" />
            {isCommunityMode ? "Add Member" : "Add Participant"}
          </Button>
        </PermissionGate>
      </CardHeader>

      <CardContent>
        {participants.length === 0 ? (
          <EmptyState
            title={
              isCommunityMode
                ? "No members added yet"
                : "No participants enrolled"
            }
            description={
              isCommunityMode
                ? "Add the people who are taking part in this activity period."
                : "Enroll active tenant users into this operating cycle."
            }
            icon={<Users className="size-5" />}
            action={
              <PermissionGate permissions={["cycle_participant:add"]}>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(appPath(`/cycles/${cycleId}/participants/new`))
                  }
                >
                  <Plus className="mr-2 size-4" />
                  {isCommunityMode ? "Add First Member" : "Add First Participant"}
                </Button>
              </PermissionGate>
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {participants.map((participant) => {
              const user = participant.tenantUser?.user;
              const fullName = user
                ? `${user.firstName} ${user.lastName}`.trim()
                : isCommunityMode
                  ? "Unknown member"
                  : "Unknown participant";

              return (
                <button
                  key={participant.id}
                  type="button"
                  onClick={() =>
                    navigate(appPath(`/cycle-participants/${participant.id}`))
                  }
                  className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-4 text-left transition hover:bg-[var(--secondary)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--foreground)]">
                      {fullName}
                    </p>

                    <p className="truncate text-sm text-[var(--muted-foreground)]">
                      {user?.email ?? "No email"}
                    </p>

                    {isCommunityMode ? (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {memberLabel} in this activity period
                      </p>
                    ) : null}
                  </div>

                  <StatusBadge status={participant.status} />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}