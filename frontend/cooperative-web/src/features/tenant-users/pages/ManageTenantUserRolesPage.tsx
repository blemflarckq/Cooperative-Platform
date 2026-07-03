import { useParams } from "react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { RoleChips } from "@/features/tenant-users/components/RoleChips";
import { useTenantUser } from "@/features/tenant-users/hooks/useTenantUser";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";


export function ManageTenantUserRolesPage() {
  const { tenantUserId } = useParams();
  const tenantUserQuery = useTenantUser(tenantUserId!);
  //const { navigateToApp } = useTenantNavigation();
  const { appPath } = useTenantNavigation();

  if (tenantUserQuery.isLoading) return <LoadingState />;
  if (tenantUserQuery.isError || !tenantUserQuery.data) return <ErrorState />;

  const tenantUser = tenantUserQuery.data;

  return (
    <div>
      <PageHeader
        title="Manage Roles"
        description={`Assign or revoke tenant-scoped roles for ${tenantUser.fullName}.`}
        backTo={appPath(`/members/${tenantUser.id}`)}
        backLabel="Back to Member"
      />

      <Card className="border-border bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Current Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleChips roles={tenantUser.roles} />

          <p className="mt-5 text-sm text-muted-foreground">
            Role assignment controls will be wired once the tenant role endpoints
            are shared.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}