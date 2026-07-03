import { /*useNavigate,*/ useParams } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { TenantUserForm } from "@/features/tenant-users/components/TenantUserForm";
import { useTenantUser } from "@/features/tenant-users/hooks/useTenantUser";
import { useUpdateTenantUser } from "@/features/tenant-users/hooks/useUpdateTenantUser";
import type { TenantUserFormValues } from "@/features/tenant-users/schemas/tenant-user.schema";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

export function EditTenantUserPage() {
  const { tenantUserId } = useParams();
  //const navigate = useNavigate();
  const { navigateToApp } = useTenantNavigation();
  const { appPath } = useTenantNavigation();


  const tenantUserQuery = useTenantUser(tenantUserId!);
  const updateTenantUserMutation = useUpdateTenantUser();

  if (tenantUserQuery.isLoading) return <LoadingState />;

  if (tenantUserQuery.isError || !tenantUserQuery.data) {
    return (
      <ErrorState
        title="Could not load member"
        description="The tenant membership could not be loaded for editing."
      />
    );
  }

  const tenantUser = tenantUserQuery.data;

  function handleSubmit(values: TenantUserFormValues) {
    updateTenantUserMutation.mutate(
      {
        tenantUserId: tenantUser.id,
        values,
      },
      {
        onSuccess: () => {
          toast.success("Member updated successfully");
          navigateToApp(`/members/${tenantUser.id}`);
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit Member"
        description={`Update the user identity record for ${tenantUser.fullName}.`}
        backTo={appPath(`/members/${tenantUser.id}`)}
        backLabel="Back to Member"
      />

      {updateTenantUserMutation.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Could not update member"
            description={getApiErrorMessage(updateTenantUserMutation.error)}
          />
        </div>
      ) : null}

      <TenantUserForm
        defaultValues={{
          firstName: tenantUser.firstName,
          lastName: tenantUser.lastName,
          email: tenantUser.email,
        }}
        onSubmit={handleSubmit}
        isLoading={updateTenantUserMutation.isPending}
        submitLabel="Update Member"
      />
    </div>
  );
}