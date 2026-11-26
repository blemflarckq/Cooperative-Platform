import { useMemo, useState } from "react";
import { useParams } from "react-router";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { RolePicker } from "@/features/tenant-users/components/RolePicker";
import { CHANGE_REACHES_THEM } from "@/features/tenant-users/constants";
import { useCurrentTenantUser } from "@/features/tenant-users/hooks/useCurrentTenantUser";
import { useSyncTenantUserRoles } from "@/features/tenant-users/hooks/useSyncTenantUserRoles";
import { useTenantRoles } from "@/features/tenant-users/hooks/useTenantRoles";
import { useTenantUser } from "@/features/tenant-users/hooks/useTenantUser";

/**
 * Give someone roles or take them away. Shows what each role lets a
 * person do, says exactly what is about to change before anything is
 * saved, and says when it will reach them. The save button is never
 * disabled without a line saying why.
 *
 * Which roles the viewer may hand out (the administrator role is for
 * administrators only) comes from the server with each role, so a role
 * out of reach is shown with its reason instead of being hidden or
 * failing after the tap.
 */
export function ManageTenantUserRolesPage() {
  const { tenantUserId } = useParams();
  const { navigateToApp, appPath } = useTenantNavigation();

  const memberQuery = useTenantUser(tenantUserId!);
  const meQuery = useCurrentTenantUser();
  const rolesQuery = useTenantRoles();
  const sync = useSyncTenantUserRoles();

  // null = the person hasn't touched anything; show what they have now.
  const [picked, setPicked] = useState<Set<string> | null>(null);

  const member = memberQuery.data;
  const currentIds = useMemo(
    () => new Set((member?.roles ?? []).map((role) => role.id)),
    [member],
  );
  const selected = picked ?? currentIds;

  if (memberQuery.isLoading || rolesQuery.isLoading || meQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (memberQuery.isError || !member) {
    return (
      <PageContainer>
        <ErrorState title="Could not load this member" description="Go back and try again." />
      </PageContainer>
    );
  }

  const memberPath = `/members/${member.id}`;
  const firstName = member.firstName || member.fullName;

  if (meQuery.data?.id === member.id) {
    return (
      <PageContainer>
        <PageHeader
          title="Change roles"
          backTo={appPath(memberPath)}
          backLabel={member.fullName}
        />
        <Card className="gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <h2 className="text-sm font-medium">You can't change your own roles</h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Anyone who can give out roles needs a second person to change their own — the same way
            nobody approves their own request. Ask another administrator to do it.
          </p>
          <div>
            <Button variant="outline" onClick={() => navigateToApp(memberPath)}>
              Back
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  if (rolesQuery.isError || !rolesQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Could not load the roles"
          description="Go back and try again."
        />
      </PageContainer>
    );
  }

  const roles = rolesQuery.data;
  const added = roles.filter((role) => selected.has(role.id) && !currentIds.has(role.id));
  const removed = roles.filter((role) => !selected.has(role.id) && currentIds.has(role.id));
  const changed = added.length > 0 || removed.length > 0;
  const hasAnyRole = selected.size > 0;
  const canSave = changed && hasAnyRole && !sync.isPending;

  function toggle(roleId: string) {
    const next = new Set(selected);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    setPicked(next);
  }

  function save() {
    sync.mutate(
      { tenantUserId: member!.id, roleIds: [...selected] },
      { onSuccess: () => navigateToApp(memberPath) },
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Change roles"
        description={`What ${member.fullName} is allowed to do in the cooperative.`}
        backTo={appPath(memberPath)}
        backLabel={member.fullName}
      />

      <RolePicker
        roles={roles}
        selectedIds={selected}
        onToggle={toggle}
        disabled={sync.isPending}
      />

      <Card className="gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        {changed ? (
          <div className="text-sm leading-6">
            {added.length > 0 ? (
              <div>
                <span className="text-[var(--muted-foreground)]">Giving {firstName} </span>
                <span className="font-medium">{added.map((role) => role.name).join(", ")}</span>
              </div>
            ) : null}
            {removed.length > 0 ? (
              <div>
                <span className="text-[var(--muted-foreground)]">Taking away </span>
                <span className="font-medium">{removed.map((role) => role.name).join(", ")}</span>
              </div>
            ) : null}
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              The change reaches them {CHANGE_REACHES_THEM}.
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            {hasAnyRole
              ? "No changes yet. Tap a role to give it or take it away."
              : "Pick at least one role."}
          </p>
        )}

        {!hasAnyRole && changed ? (
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">
            Everyone needs at least one role. To take someone out of the cooperative, deactivate
            them instead.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => navigateToApp(memberPath)} disabled={sync.isPending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {sync.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
