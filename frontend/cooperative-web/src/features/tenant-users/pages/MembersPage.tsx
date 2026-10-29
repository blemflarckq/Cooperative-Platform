import { useMemo, useState } from "react";
import { Search, UserCog } from "lucide-react";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/formatting/date";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { InviteMemberDialog } from "@/features/membership/components/InviteMemberDialog";
import { PendingEnrollmentsSection } from "@/features/membership/components/PendingEnrollmentsSection";
import { RoleChips } from "@/features/tenant-users/components/RoleChips";
import { useTenantUsers } from "@/features/tenant-users/hooks/useTenantUsers";
import type { TenantUserListItem } from "@/features/tenant-users/types/tenant-user.types";

// Two separate permissions, not one "admin" switch: who may invite and who
// may decide on requests can be given out independently. Admin and
// treasurer hold both by default. The backend enforces the same two.
const INVITE_PERMISSION = ["membership:invite"];
const APPROVE_PERMISSION = ["membership:approve"];

/**
 * The people in the cooperative: who they are, how to recognise them
 * without exposing their number, what they belong to, what they can do,
 * and since when. Phone numbers arrive already masked from the server —
 * this list is readable by every member, so masking can't be left to
 * the UI.
 *
 * Joining is its own governed path (invite link → two approvals), shown
 * above the list for the people who decide it. Appointing someone
 * directly to a staff role is a different, older mechanism and keeps its
 * own button.
 */
export function MembersPage() {
  const { navigateToApp } = useTenantNavigation();
  const membersQuery = useTenantUsers();
  const [search, setSearch] = useState("");

  const members = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = membersQuery.data ?? [];
    if (!term) return all;
    return all.filter(
      (member) =>
        member.fullName.toLowerCase().includes(term) || member.email.toLowerCase().includes(term),
    );
  }, [membersQuery.data, search]);

  return (
    <PageContainer>
      <PageHeader
        title="Members"
        description="The people in your cooperative."
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permissions={INVITE_PERMISSION}>
              <InviteMemberDialog />
            </PermissionGate>
            <PermissionGate permissions={["user:create"]}>
              <Button variant="outline" onClick={() => navigateToApp("/members/new")}>
                <UserCog className="mr-1.5 size-4" />
                Appoint staff
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <PermissionGate permissions={APPROVE_PERMISSION}>
        <PendingEnrollmentsSection />
      </PermissionGate>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          className="pl-9"
          placeholder="Search by name or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {membersQuery.isLoading ? (
        <LoadingState />
      ) : membersQuery.isError ? (
        <ErrorState title="Could not load members" />
      ) : members.length === 0 ? (
        <EmptyState
          title={search ? "No one matches that search" : "No members yet"}
          description={search ? "Try a different name or email." : "Invite someone to get started."}
        />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onOpen={() => navigateToApp(`/members/${member.id}`)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function MemberCard({ member, onOpen }: { member: TenantUserListItem; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full text-left">
      <Card className="h-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{member.fullName}</div>
            <div className="text-xs text-[var(--muted-foreground)]">
              {member.mobileMasked ?? "No phone number"}
            </div>
          </div>
          <StatusBadge status={member.status.toUpperCase()} />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {member.schemeNames.length > 0 ? (
            member.schemeNames.map((name) => (
              <Badge key={name} variant="outline" className="font-normal">
                {name}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-[var(--muted-foreground)]">Not in any scheme yet</span>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <RoleChips roles={member.roles} />
          <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
            Joined {formatDate(member.createdAt)}
          </span>
        </div>
      </Card>
    </button>
  );
}
