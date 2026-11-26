import { useParams } from "react-router";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { SchemeForm } from "../components/SchemeForm";
import { useScheme } from "../hooks/useScheme";
import { useSchemeWords } from "../hooks/useSchemeWords";
import { useUpdateScheme } from "../hooks/useUpdateScheme";
import type { SchemeFormValues } from "../schemas/scheme.schema";
import type { UpdateSchemeRequest } from "../types/scheme.types";
import { isStructureLocked } from "../utils/scheme-state";

/**
 * Changing a scheme. The name and description can always change. The code
 * and the four rules can only change while it's still a draft — after
 * that they're shown, with the reason, instead of offered. Only what
 * actually changed is sent, so saving a new name can never be refused
 * because of a rule the person never touched.
 */
export function EditSchemePage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const { navigateToApp, appPath } = useTenantNavigation();
  const words = useSchemeWords();

  const schemeQuery = useScheme(schemeId!);
  const update = useUpdateScheme();

  if (schemeQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (schemeQuery.isError || !schemeQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title={`Could not load this ${words.noun}`}
          description="Go back and try again."
        />
      </PageContainer>
    );
  }

  const scheme = schemeQuery.data;
  const schemePath = `/schemes/${scheme.id}`;

  function handleSubmit(values: SchemeFormValues, changed: Array<keyof SchemeFormValues>) {
    const payload: UpdateSchemeRequest = {};
    for (const key of changed) {
      if (key === "name") payload.name = values.name;
      else if (key === "description") payload.description = values.description?.trim() ?? "";
      else if (key === "code") {
        // A blank code means "make it from the name" on create; on edit, leaving it as it was.
        if (values.code?.trim()) payload.code = values.code.trim();
      } else {
        (payload as Record<string, string>)[key] = values[key];
      }
    }

    if (Object.keys(payload).length === 0) {
      navigateToApp(schemePath);
      return;
    }

    update.mutate(
      { schemeId: scheme.id, values: payload },
      { onSuccess: () => navigateToApp(schemePath) },
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={`Edit ${words.noun}`}
        backTo={appPath(schemePath)}
        backLabel={scheme.name}
      />

      {scheme.status === "ARCHIVED" ? (
        <Card className="gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <h2 className="text-sm font-medium">This {words.noun} is archived</h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Archived is closed for good, and nothing about it can be changed. Its history is kept.
          </p>
          <div>
            <Button variant="outline" onClick={() => navigateToApp(schemePath)}>
              Back to {scheme.name}
            </Button>
          </div>
        </Card>
      ) : (
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
          structureLocked={isStructureLocked(scheme.status)}
          requireChange
          submitLabel="Save changes"
          savingLabel="Saving…"
          isLoading={update.isPending}
          onSubmit={handleSubmit}
          onCancel={() => navigateToApp(schemePath)}
        />
      )}
    </PageContainer>
  );
}
