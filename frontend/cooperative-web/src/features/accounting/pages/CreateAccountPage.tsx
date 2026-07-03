import { useNavigate } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { AccountForm } from "../components/AccountForm";
import { useCreateAccount } from "../hooks/useCreateAccount";
import { type AccountFormValues } from "../schemas/account.schema";

export function CreateAccountPage() {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();
  const mutation = useCreateAccount();

  function handleSubmit(values: AccountFormValues) {
    mutation.mutate(values, {
      onSuccess: (account) => {
        toast.success("Account created successfully");
        navigate(appPath(`/accounting/accounts/${account.id}`));
      },
    });
  }

  return (
    <div>
      <PageHeader
        title="Create Account"
        description="Create a non-system account in the tenant chart of accounts."
        backTo="/accounting/accounts"
        backLabel="Back to Accounts"
      />

      {mutation.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Could not create account"
            description={getApiErrorMessage(mutation.error)}
          />
        </div>
      ) : null}

      <AccountForm
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        submitLabel="Create Account"
      />
    </div>
  );
}