import { KeyRound, Pencil, UserX } from "lucide-react";
import { /*useNavigate,*/ useParams } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleChips } from "@/features/tenant-users/components/RoleChips";
import { useDeactivateTenantUser } from "@/features/tenant-users/hooks/useDeactivateTenantUser";
import { useTenantUser } from "@/features/tenant-users/hooks/useTenantUser";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

export function TenantUserDetailsPage() {
  const { tenantUserId } = useParams();
  //const navigate = useNavigate();
  const { navigateToApp } = useTenantNavigation();
  const { appPath } = useTenantNavigation();


  const tenantUserQuery = useTenantUser(tenantUserId!);
  const deactivateMutation = useDeactivateTenantUser();

  if (tenantUserQuery.isLoading) return <LoadingState />;
  if (tenantUserQuery.isError || !tenantUserQuery.data) return <ErrorState />;

  const tenantUser = tenantUserQuery.data;

  function handleDeactivate() {
    deactivateMutation.mutate(tenantUser.id, {
      onSuccess: () => {
        toast.success("Membership deactivated");
      },
    });
  }

  return (
    <div>
      <PageHeader
        title={tenantUser.fullName}
        description="View this user’s tenant membership, assigned roles, and identity status."
        backTo={appPath("/members")}
        backLabel="Back to Members"
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permissions={["user:update"]}>
              <Button
                variant="outline"
                onClick={() => navigateToApp(`/members/${tenantUser.id}/edit`)}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["role:read"]}>
              <Button
                variant="outline"
                onClick={() => navigateToApp(`/members/${tenantUser.id}/roles`)}
              >
                <KeyRound className="mr-2 size-4" />
                Manage Roles
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["savings_statement:read"]}>
              <Button
                variant="outline"
                onClick={() =>
                  navigateToApp(`/members/${tenantUser.id}/savings-statement`)
                }
              >
                Savings Statement
              </Button>
            </PermissionGate>

            <PermissionGate permissions={["user:deactivate"]}>
              <Button
                variant="outline"
                onClick={handleDeactivate}
                disabled={
                  deactivateMutation.isPending || !tenantUser.membershipIsActive
                }
              >
                <UserX className="mr-2 size-4" />
                Deactivate Membership
              </Button>
            </PermissionGate>
            <PermissionGate permissions={["user:create"]}>
              <Button
                variant="outline"
                //onClick={handleResendInvitation}
                disabled
              >
                <UserX className="mr-2 size-4" />
                Resend Invitation
              </Button>
            </PermissionGate>
            <PermissionGate permissions={["user:create"]}>
              <Button
                variant="outline"
                //onClick={handleRevokeInvitation}
                disabled
              >
                <UserX className="mr-2 size-4" />
                Revoke Invitation
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle className="text-lg">User Identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <DetailItem label="Full Name" value={tenantUser.fullName} />
            <DetailItem label="Email" value={tenantUser.email} />
            <DetailItem
              label="User Account"
              value={tenantUser.userIsActive ? "Active" : "Inactive"}
            />
            <DetailItem label="User ID" value={tenantUser.userId} />
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle className="text-lg">Tenant Membership</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <DetailItem
              label="Membership Status"
              value={<StatusBadge status={tenantUser.status} />}
            />
            <DetailItem
              label="Membership Active"
              value={tenantUser.membershipIsActive ? "Yes" : "No"}
            />
            <DetailItem
              label="Created"
              value={new Date(tenantUser.createdAt).toLocaleString()}
            />
            <DetailItem
              label="Updated"
              value={new Date(tenantUser.updatedAt).toLocaleString()}
            />
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Tenant Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleChips roles={tenantUser.roles} />
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              Audit & Identity Events
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted-foreground)]">
            Audit trail and outbox-backed identity events will appear here when
            the audit/event read model endpoint is available.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

function DetailItem({ label, value }: DetailItemProps) {
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