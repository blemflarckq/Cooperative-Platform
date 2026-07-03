import { useMemo, useState } from "react";
import { Check, Search, UserPlus, Users } from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTenantUsers } from "@/features/tenant-users/hooks/useTenantUsers";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { cn } from "@/lib/utils/cn";

import { useBulkCreateCycleParticipants } from "../hooks/useBulkCreateCycleParticipants";
import { useCycleParticipants } from "../hooks/useCycleParticipants";
import type { BulkCreateCycleParticipantsResponse } from "../types/cycle-participant.types";

export function AddCycleParticipantPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const [search, setSearch] = useState("");
  const [selectedTenantUserIds, setSelectedTenantUserIds] = useState<string[]>(
    [],
  );
  const [skippedResults, setSkippedResults] = useState<
    BulkCreateCycleParticipantsResponse["skipped"]
  >([]);

  const tenantUsersQuery = useTenantUsers();
  const participantsQuery = useCycleParticipants(cycleId!);
  const bulkCreateMutation = useBulkCreateCycleParticipants();

  const tenantUsers = tenantUsersQuery.data ?? [];
  const participants = participantsQuery.data?.data ?? [];

  const personLabel = isCommunityMode ? t.term("participant") : "Participant";
  const peopleLabel = isCommunityMode ? t.terms("participant") : "Participants";
  const cycleLabel = isCommunityMode ? t.term("cycle") : "Operating Cycle";

  const enrolledTenantUserIds = useMemo(
    () => new Set(participants.map((participant) => participant.tenantUserId)),
    [participants],
  );

  const alreadyEnrolledUsers = useMemo(() => {
    return tenantUsers.filter((tenantUser) =>
      enrolledTenantUserIds.has(tenantUser.id),
    );
  }, [tenantUsers, enrolledTenantUserIds]);

  const availableUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tenantUsers
      .filter((tenantUser) => tenantUser.membershipIsActive)
      .filter((tenantUser) => !enrolledTenantUserIds.has(tenantUser.id))
      .filter((tenantUser) => {
        if (!normalizedSearch) return true;

        return (
          tenantUser.fullName.toLowerCase().includes(normalizedSearch) ||
          tenantUser.email.toLowerCase().includes(normalizedSearch) ||
          tenantUser.roles.some((role) =>
            role.name.toLowerCase().includes(normalizedSearch),
          )
        );
      });
  }, [tenantUsers, enrolledTenantUserIds, search]);

  const allVisibleSelected =
    availableUsers.length > 0 &&
    availableUsers.every((user) => selectedTenantUserIds.includes(user.id));

  const isLoading = tenantUsersQuery.isLoading || participantsQuery.isLoading;
  const error = tenantUsersQuery.error ?? participantsQuery.error;

  if (isLoading) return <LoadingState />;

  if (tenantUsersQuery.isError || participantsQuery.isError) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load member data"
            : "Could not load participant data"
        }
        description={getApiErrorMessage(error)}
      />
    );
  }

  function toggleUser(tenantUserId: string) {
    setSelectedTenantUserIds((current) =>
      current.includes(tenantUserId)
        ? current.filter((id) => id !== tenantUserId)
        : [...current, tenantUserId],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = new Set(availableUsers.map((user) => user.id));

      setSelectedTenantUserIds((current) =>
        current.filter((id) => !visibleIds.has(id)),
      );

      return;
    }

    setSelectedTenantUserIds((current) => {
      const next = new Set(current);

      availableUsers.forEach((user) => {
        next.add(user.id);
      });

      return Array.from(next);
    });
  }

  function handleAddSelected() {
    if (!cycleId || selectedTenantUserIds.length === 0) return;

    bulkCreateMutation.mutate(
      {
        cycleId,
        tenantUserIds: selectedTenantUserIds,
      },
      {
        onSuccess: (response) => {
          const enrolledCount = response.enrolled.length;
          const skippedCount = response.skipped.length;

          setSkippedResults(response.skipped);

          if (response.enrolledCount > 0 && response.skippedCount === 0) {
            toast.success(
              isCommunityMode
                ? `${response.enrolledCount} member(s) added successfully`
                : `${response.enrolledCount} participant(s) added successfully`,
            );
          } else if (response.enrolledCount > 0 && response.skippedCount > 0) {
            toast.warning(
              isCommunityMode
                ? `${enrolledCount} member(s) added. ${skippedCount} skipped.`
                : `${enrolledCount} participant(s) added. ${skippedCount} skipped.`,
            );
          } else {
            toast.error(
              isCommunityMode
                ? "No members were added"
                : "No participants were added",
            );
          }

          setSelectedTenantUserIds([]);
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        title={isCommunityMode ? "Add Members" : "Add Cycle Participants"}
        description={
          isCommunityMode
            ? `Select people who should participate in this ${cycleLabel.toLowerCase()}.`
            : "Enroll active tenant members into this operating cycle. Search, select, and add participants in bulk."
        }
        backTo={`/cycles/${cycleId}`}
        backLabel={isCommunityMode ? `Back to ${cycleLabel}` : "Back to Cycle"}
        actions={
          <Button
            onClick={handleAddSelected}
            disabled={
              selectedTenantUserIds.length === 0 || bulkCreateMutation.isPending
            }
          >
            <UserPlus className="mr-2 size-4" />
            {bulkCreateMutation.isPending
              ? isCommunityMode
                ? "Adding Members..."
                : "Adding..."
              : isCommunityMode
                ? `Add Selected Members (${selectedTenantUserIds.length})`
                : `Add Selected (${selectedTenantUserIds.length})`}
          </Button>
        }
      />

      {skippedResults.length > 0 ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">
              {isCommunityMode ? "Skipped Members" : "Skipped Enrollments"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-2">
            {skippedResults.map((item) => (
              <div
                key={item.tenantUserId}
                className="rounded-xl border border-amber-200 bg-[var(--card)] p-3"
              >
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {item.tenantUserId}
                </p>
                <p className="text-sm text-amber-700">{item.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  {isCommunityMode ? "Available People" : "Available Members"}
                </CardTitle>

                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {isCommunityMode
                    ? `These active people are not yet part of this ${cycleLabel.toLowerCase()}.`
                    : "These active tenant members are not yet enrolled in this cycle."}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={toggleAllVisible}
                disabled={availableUsers.length === 0}
              >
                {allVisibleSelected ? "Clear Visible" : "Select Visible"}
              </Button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, or role..."
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent>
            {availableUsers.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-6 text-center">
                <Users className="mx-auto size-8 text-[var(--muted-foreground)]" />
                <p className="mt-3 font-medium text-[var(--foreground)]">
                  {isCommunityMode
                    ? "No available people found"
                    : "No available members found"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {isCommunityMode
                    ? "Everyone may already be added, or your search returned no results."
                    : "Everyone may already be enrolled, or your search returned no results."}
                </p>
              </div>
            ) : (
              <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {availableUsers.map((tenantUser) => {
                  const selected = selectedTenantUserIds.includes(
                    tenantUser.id,
                  );

                  return (
                    <button
                      key={tenantUser.id}
                      type="button"
                      onClick={() => toggleUser(tenantUser.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition",
                        selected
                          ? "border-[var(--primary)] bg-emerald-50 ring-4 ring-emerald-100"
                          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/60 hover:bg-[var(--secondary)]",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]">
                          {tenantUser.fullName}
                        </p>

                        <p className="truncate text-sm text-[var(--muted-foreground)]">
                          {tenantUser.email}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {tenantUser.roles.slice(0, 3).map((role) => (
                            <span
                              key={role.id}
                              className="rounded-lg bg-[var(--secondary)] px-2 py-1 text-xs text-[var(--muted-foreground)]"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full border",
                          selected
                            ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                            : "border-[var(--border)] bg-[var(--card)]",
                        )}
                      >
                        {selected ? <Check className="size-4" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>
              {isCommunityMode
                ? `Already Added ${peopleLabel}`
                : "Already Enrolled"}
            </CardTitle>

            <p className="text-sm text-[var(--muted-foreground)]">
              {isCommunityMode
                ? `${peopleLabel} currently part of this ${cycleLabel.toLowerCase()}.`
                : "Members currently participating in this cycle."}
            </p>
          </CardHeader>

          <CardContent>
            {alreadyEnrolledUsers.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                {isCommunityMode
                  ? `No ${peopleLabel.toLowerCase()} have been added yet.`
                  : "No members have been enrolled yet."}
              </p>
            ) : (
              <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {alreadyEnrolledUsers.map((tenantUser) => {
                  const participant = participants.find(
                    (item) => item.tenantUserId === tenantUser.id,
                  );

                  return (
                    <div
                      key={tenantUser.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--foreground)]">
                            {tenantUser.fullName}
                          </p>

                          <p className="truncate text-sm text-[var(--muted-foreground)]">
                            {tenantUser.email}
                          </p>

                          {isCommunityMode ? (
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {personLabel} in this activity period
                            </p>
                          ) : null}
                        </div>

                        {participant ? (
                          <StatusBadge status={participant.status} />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}