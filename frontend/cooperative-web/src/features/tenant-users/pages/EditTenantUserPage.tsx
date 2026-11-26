import { useParams } from "react-router";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { TenantUserForm } from "@/features/tenant-users/components/TenantUserForm";
import { useTenantUser } from "@/features/tenant-users/hooks/useTenantUser";
import { useUpdateTenantUser } from "@/features/tenant-users/hooks/useUpdateTenantUser";
import type { TenantUserFormValues } from "@/features/tenant-users/schemas/tenant-user.schema";

/**
 * Correcting how someone's name appears. Names only: email and phone are
 * how people sign in, so they're not editable here — and when the person
 * belongs to other cooperatives too, their name isn't this cooperative's
 * to change at all. The page says which of those applies instead of
 * offering a form that would be refused.
 */
export function EditTenantUserPage() {
  const { tenantUserId } = useParams();
  const { navigateToApp, appPath } = useTenantNavigation();

  const memberQuery = useTenantUser(tenantUserId!);
  const update = useUpdateTenantUser();

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
          description="Go back and try again."
        />
      </PageContainer>
    );
  }

  const member = memberQuery.data;
  const memberPath = `/members/${member.id}`;
  const firstName = member.firstName || member.fullName;

  function handleSubmit(values: TenantUserFormValues) {
    update.mutate(
      { tenantUserId: member.id, values },
      { onSuccess: () => navigateToApp(memberPath) },
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Edit name"
        description={
          member.identityShared
            ? undefined
            : `Correct how ${member.fullName} appears in the cooperative.`
        }
        backTo={appPath(memberPath)}
        backLabel={member.fullName}
      />

      {member.identityShared ? (
        <Card className="gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <h2 className="text-sm font-medium">Only {firstName} can change this</h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {firstName} belongs to other cooperatives too, and their name is the same in all of
            them, so no single cooperative can change it.
          </p>
          <div>
            <Button variant="outline" onClick={() => navigateToApp(memberPath)}>
              Back to {firstName}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <TenantUserForm
            defaultValues={{ firstName: member.firstName, lastName: member.lastName }}
            onSubmit={handleSubmit}
            onCancel={() => navigateToApp(memberPath)}
            isLoading={update.isPending}
          />
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">
            Email and phone number are how people sign in, so they can't be changed here.
          </p>
        </>
      )}
    </PageContainer>
  );
}
