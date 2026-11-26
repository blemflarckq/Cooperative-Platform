import type { ReactNode } from "react";
import { ChevronRight, KeyRound, Pencil } from "lucide-react";
import { useParams } from "react-router";

import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatDate } from "@/lib/formatting/date";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { MemberStatusBadge } from "@/features/tenant-users/components/MemberStatusBadge";
import { ADMIN_ROLE_CODE, CHANGE_REACHES_THEM } from "@/features/tenant-users/constants";
import { useCurrentTenantUser } from "@/features/tenant-users/hooks/useCurrentTenantUser";
import { useDeactivateTenantUser } from "@/features/tenant-users/hooks/useDeactivateTenantUser";
import { useReactivateTenantUser } from "@/features/tenant-users/hooks/useReactivateTenantUser";
import { useTenantUser } from "@/features/tenant-users/hooks/useTenantUser";

const cardClass =
  "gap-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0";

/**
 * One member, and what can be done about them. Two actions at most sit in
 * the header (change roles, edit name); everything that can't be done is
 * stated in place where the action would have been, with the reason —
 * never a disabled button, never a silent gap.
 *
 * Whether the viewer may act is worked out from what the server knows
 * about them right now (their own record, with roles), so the screen
 * says "only an administrator can…" up front instead of failing after
 * the tap. The server enforces every one of these rules regardless.
 */
export function TenantUserDetailsPage() {
  const { tenantUserId } = useParams();
  const { navigateToApp, appPath } = useTenantNavigation();
  const { hasPermission } = useAuth();

  const memberQuery = useTenantUser(tenantUserId!);
  const meQuery = useCurrentTenantUser();
  const deactivate = useDeactivateTenantUser();
  const reactivate = useReactivateTenantUser();

  if (memberQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Could not load this member"
          description="They may have been removed, or the connection dropped. Go back and try again."
        />
      </PageContainer>
    );
  }

  const member = memberQuery.data;
  const me = meQuery.data;

  const hasJoined = member.status !== "invited";
  const isDeactivated = hasJoined && !member.membershipIsActive;
  const isSelf = me?.id === member.id;
  const viewerIsAdmin = me?.roles.some((role) => role.code === ADMIN_ROLE_CODE) ?? false;
  const memberIsAdmin = member.roles.some((role) => role.code === ADMIN_ROLE_CODE);
  const firstName = member.firstName || member.fullName;

  const mayChangeRoles = hasPermission(["user:assign-role"]);
  const mayEditName = hasPermission(["user:update"]);
  const mayDeactivate = hasPermission(["user:deactivate"]);
  const mayReactivate = hasPermission(["user:activate"]);

  return (
    <PageContainer>
      <PageHeader
        title={member.fullName}
        backTo={appPath("/members")}
        backLabel="Members"
        actions={
          <div className="flex flex-wrap gap-2">
            {mayChangeRoles && !isSelf && hasJoined && !isDeactivated ? (
              <Button onClick={() => navigateToApp(`/members/${member.id}/roles`)}>
                <KeyRound className="mr-1.5 size-4" />
                Change roles
              </Button>
            ) : null}
            {mayEditName && !member.identityShared && hasJoined ? (
              <Button variant="outline" onClick={() => navigateToApp(`/members/${member.id}/edit`)}>
                <Pencil className="mr-1.5 size-4" />
                Edit name
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={cardClass}>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-medium">Contact</h2>
            <MemberStatusBadge member={member} />
          </div>
          <dl className="mt-3 grid gap-3">
            <Fact label="Email" value={member.email} />
            <Fact label="Phone" value={member.mobileMasked ?? "No phone number"} />
            <Fact label="Joined" value={formatDate(member.createdAt)} />
          </dl>
          {member.identityShared && mayEditName ? (
            <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">
              {firstName} belongs to other cooperatives too, so only they can change their name.
            </p>
          ) : null}
        </Card>

        <Card className={cardClass}>
          <h2 className="text-sm font-medium">Schemes</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            What {firstName} is taking part in right now.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {member.schemeNames.length > 0 ? (
              member.schemeNames.map((name) => (
                <Badge key={name} variant="outline" className="font-normal">
                  {name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-[var(--muted-foreground)]">Not in any scheme yet</span>
            )}
          </div>
        </Card>
      </div>

      <Card className={cardClass}>
        <h2 className="text-sm font-medium">Roles</h2>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          What {firstName} is allowed to do in the cooperative.
        </p>

        {member.roles.length > 0 ? (
          <ul className="mt-3 grid gap-3">
            {member.roles.map((role) => (
              <li key={role.id}>
                <div className="text-sm font-medium">{role.name}</div>
                {role.description ? (
                  <div className="text-xs leading-5 text-[var(--muted-foreground)]">
                    {role.description}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">No roles assigned yet</p>
        )}

        {mayChangeRoles && hasJoined ? (
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted-foreground)]">
            {isSelf
              ? "You can't change your own roles. Ask another administrator."
              : isDeactivated
                ? "Reactivate them to change their roles."
                : `A change reaches them ${CHANGE_REACHES_THEM}.`}
          </p>
        ) : null}
      </Card>

      {hasPermission(["savings_statement:read"]) && hasJoined ? (
        <button
          type="button"
          onClick={() => navigateToApp(`/reports/${member.id}/savings-statement`)}
          className="w-full text-left"
        >
          <Card className={`${cardClass} flex-row items-center justify-between gap-3`}>
            <div>
              <div className="text-sm font-medium">Savings statement</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                What {firstName} has saved, and when
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" />
          </Card>
        </button>
      ) : null}

      {hasJoined && (mayDeactivate || mayReactivate) && me ? (
        <Card className={cardClass}>
          <h2 className="text-sm font-medium">Membership</h2>

          {isDeactivated ? (
            <>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                {firstName} is deactivated. They can't sign in to the cooperative, and their savings,
                loans and history are kept.
              </p>
              {mayReactivate ? (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    disabled={reactivate.isPending}
                    onClick={() => reactivate.mutate(member.id)}
                  >
                    {reactivate.isPending ? "Reactivating…" : "Reactivate"}
                  </Button>
                </div>
              ) : null}
            </>
          ) : mayDeactivate ? (
            <>
              {!isSelf ? (
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  Deactivating stops {firstName} signing in to the cooperative. Nothing is deleted.
                </p>
              ) : null}
              <div className="mt-3">
                {isSelf ? (
                  <Constraint>You can't deactivate yourself. Ask another administrator.</Constraint>
                ) : memberIsAdmin && !viewerIsAdmin ? (
                  <Constraint>Only an administrator can deactivate an administrator.</Constraint>
                ) : (
                  <ConfirmActionDialog
                    trigger={
                      <Button
                        variant="outline"
                        className="text-[var(--destructive)]"
                        disabled={deactivate.isPending}
                      >
                        Deactivate member
                      </Button>
                    }
                    title={`Deactivate ${member.fullName}?`}
                    description={`They'll be signed out ${CHANGE_REACHES_THEM} and won't be able to sign back in. Their savings, loans and history stay exactly as they are, and you can reactivate them at any time.`}
                    confirmLabel="Deactivate"
                    loadingLabel="Deactivating…"
                    variant="destructive"
                    isLoading={deactivate.isPending}
                    onConfirm={() => deactivate.mutate(member.id)}
                  />
                )}
              </div>
            </>
          ) : null}
        </Card>
      ) : null}
    </PageContainer>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

/** A rule that blocks an action, said where the action would have been. */
function Constraint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--muted-foreground)]">{children}</p>;
}
