import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { FundSetupReviewCard } from "../components/FundSetupReviewCard";
import { FundTemplateSelector } from "../components/FundTemplateSelector";
import { SchemeForm } from "../components/SchemeForm";
import { SelectedFundTemplateSummary } from "../components/SelectedFundTemplateSummary";
import { useCreateScheme } from "../hooks/useCreateScheme";
import { type SchemeFormValues } from "../schemas/scheme.schema";
import { type FundTemplateId } from "../types/fund-template.types";
import { getTemplateFormValues } from "../utils/get-template-form-values";

type CommunityCreateStep = "template" | "details" | "review";

export function CreateSchemePage() {
  const { isCommunityMode } = useExperienceMode();
  const { navigateToApp } = useTenantNavigation();
  const createScheme = useCreateScheme();

  const [step, setStep] = useState<CommunityCreateStep>("template");
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<FundTemplateId>("savings_club");
  const [draftValues, setDraftValues] = useState<SchemeFormValues | null>(null);

  const defaultValues = useMemo(
    () => getTemplateFormValues(selectedTemplateId),
    [selectedTemplateId],
  );

  async function createSchemeFromValues(values: SchemeFormValues) {
    await createScheme.mutateAsync({
      ...values,
      code: values.code?.trim() ? values.code.trim() : undefined,
    });

    navigateToApp("/schemes");
  }

  async function handleProfessionalSubmit(values: SchemeFormValues) {
    await createSchemeFromValues(values);
  }

  function handleCommunityDetailsSubmit(values: SchemeFormValues) {
    setDraftValues(values);
    setStep("review");
  }

  async function handleCommunityFinalSubmit() {
    if (!draftValues) return;
    await createSchemeFromValues(draftValues);
  }

  function handleTemplateChange(templateId: FundTemplateId) {
    setSelectedTemplateId(templateId);
    setDraftValues(null);
  }

  if (!isCommunityMode) {
    return (
      <div>
        <PageHeader
          title="Create Scheme"
          description="Create a new scheme and configure its operating rules."
          backTo="/schemes"
        />

        <SchemeForm
          onSubmit={handleProfessionalSubmit}
          submitLabel="Create Scheme"
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Create Group Fund"
        description="Choose what your group is trying to achieve, then review the setup before saving."
        backTo="/schemes"
      />

      {step === "template" ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              What are you trying to achieve?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Pick the option closest to your group. You can still adjust the
              details before saving.
            </p>
          </div>

          <FundTemplateSelector
            value={selectedTemplateId}
            onChange={handleTemplateChange}
          />

          <div className="flex justify-end">
            <Button type="button" onClick={() => setStep("details")}>
              Continue
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {step === "details" ? (
        <div className="space-y-6">
          <SelectedFundTemplateSummary templateId={selectedTemplateId} />

          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Fund Details
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Give your fund a clear name and confirm how it should operate.
            </p>
          </div>

          <SchemeForm
            defaultValues={draftValues ?? defaultValues}
            onSubmit={handleCommunityDetailsSubmit}
            submitLabel="Review Setup"
          />

          <div className="flex justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("template")}
            >
              <ArrowLeft className="mr-2 size-4" />
              Change Template
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" && draftValues ? (
        <div className="space-y-6">
          <FundSetupReviewCard
            templateId={selectedTemplateId}
            values={draftValues}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("details")}
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to Details
            </Button>

            <Button
              type="button"
              onClick={handleCommunityFinalSubmit}
              disabled={createScheme.isPending}
            >
              {createScheme.isPending ? "Creating..." : "Create Group Fund"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}