import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { FundTemplateSelector } from "../components/FundTemplateSelector";
import { SchemeForm } from "../components/SchemeForm";
import { FUND_TEMPLATES } from "../constants/fund-templates";
import { useCreateScheme } from "../hooks/useCreateScheme";
import { useSchemeWords } from "../hooks/useSchemeWords";
import { type SchemeFormValues } from "../schemas/scheme.schema";
import { type FundTemplateId } from "../types/fund-template.types";
import { getTemplateFormValues } from "../utils/get-template-form-values";

/**
 * Two steps: what is it for, then name it. The first choice fills in
 * sensible rules (shown in plain words on the second step, changeable),
 * so most groups never open the rules at all. After creating, you land on
 * the new one — where the next step, activating it, is waiting.
 */
export function CreateSchemePage() {
  const { isProfessionalMode } = useExperienceMode();
  const { navigateToApp, appPath } = useTenantNavigation();
  const words = useSchemeWords();
  const createScheme = useCreateScheme();

  const [templateId, setTemplateId] = useState<FundTemplateId | null>(null);
  const template = FUND_TEMPLATES.find((item) => item.id === templateId);

  const defaultValues = useMemo(
    () => (templateId ? getTemplateFormValues(templateId) : {}),
    [templateId],
  );

  async function handleSubmit(values: SchemeFormValues) {
    try {
      const scheme = await createScheme.mutateAsync({
        ...values,
        description: values.description?.trim() || undefined,
        code: values.code?.trim() || undefined,
      });
      toast.success(`${words.Noun} created`);
      navigateToApp(`/schemes/${scheme.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  if (!templateId || !template) {
    return (
      <PageContainer>
        <PageHeader
          title={`New ${words.noun}`}
          description="What is it for? Pick the closest one — you can still change the details next."
          backTo={appPath("/schemes")}
          backLabel={words.Plural}
        />
        <FundTemplateSelector onSelect={setTemplateId} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title={`Name your ${words.noun}`} />

      <Card className="flex-row items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <div className="min-w-0">
          <div className="text-xs text-[var(--muted-foreground)]">Type</div>
          <div className="text-sm font-medium">{template.title}</div>
        </div>
        <Button type="button" variant="ghost" onClick={() => setTemplateId(null)} disabled={createScheme.isPending}>
          <ArrowLeft className="mr-1.5 size-4" />
          Change type
        </Button>
      </Card>

      <SchemeForm
        // A fresh form for each type, so its rules and description start from that type.
        key={templateId}
        defaultValues={defaultValues}
        rulesOpen={isProfessionalMode || templateId === "custom"}
        submitLabel={`Create ${words.noun}`}
        savingLabel="Creating…"
        isLoading={createScheme.isPending}
        onSubmit={(values) => void handleSubmit(values)}
        onCancel={() => navigateToApp("/schemes")}
      />
    </PageContainer>
  );
}
