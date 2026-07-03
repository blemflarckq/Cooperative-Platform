import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { SchemeForm } from "../components/SchemeForm";
import { useScheme } from "../hooks/useScheme";
import { useUpdateScheme } from "../hooks/useUpdateScheme";
import type { SchemeFormValues } from "../schemas/scheme.schema";

export function EditSchemePage() {
  const { schemeId } = useParams<{ schemeId: string }>();

  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  const schemeQuery = useScheme(schemeId!);
  const mutation = useUpdateScheme();

  if (schemeQuery.isLoading) return <LoadingState />;

  if (schemeQuery.isError || !schemeQuery.data) {
    return <ErrorState title="Could not load scheme" />;
  }

  const scheme = schemeQuery.data;

  function cleanSchemePayload(values: SchemeFormValues) {
    return {
      ...values,
      code: values.code?.trim() ? values.code.trim() : undefined,
      description: values.description?.trim()
        ? values.description.trim()
        : undefined,
    };
  }

  function handleSubmit(values: SchemeFormValues) {
    mutation.mutate(
      {
        schemeId: scheme.id,
        values: cleanSchemePayload(values),
      },
      {
        onSuccess: () => {
          toast.success("Scheme updated successfully");

          navigate(appPath(`/schemes/${scheme.id}`));
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${scheme.name}`}
        description="Update cooperative scheme configuration and policy behavior."
        backTo={`/schemes/${scheme.id}`}
        backLabel="Back to Scheme"
      />

      {mutation.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Could not update scheme"
            description={getApiErrorMessage(mutation.error)}
          />
        </div>
      ) : null}

      <SchemeForm
        defaultValues={{
          name: scheme.name,
          code: scheme.code,
          description: scheme.description ?? "",
          cycleMode: scheme.cycleMode,
          contributionMode: scheme.contributionMode,
          loanMode: scheme.loanMode,
          payoutMode: scheme.payoutMode,
        }}
        onSubmit={handleSubmit}
        isLoading={mutation.isPending}
        submitLabel="Save Changes"
      />
    </div>
  );
}