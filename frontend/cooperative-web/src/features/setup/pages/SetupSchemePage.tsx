import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { FUND_TEMPLATES } from "@/features/schemes/constants/fund-templates";
import type { FundTemplateId } from "@/features/schemes/types/fund-template.types";
import { getTemplateFormValues } from "@/features/schemes/utils/get-template-form-values";
import { useCreateScheme } from "@/features/schemes/hooks/useCreateScheme";
import { useActivateScheme } from "@/features/schemes/hooks/useActivateScheme";
import { useCreateCycle } from "@/features/cycles/hooks/useCreateCycle";
import { useCycleTransition } from "@/features/cycles/hooks/useCycleTransition";

const WIZARD_TEMPLATES = FUND_TEMPLATES.filter((template) => template.id !== "custom");

/**
 * Setup, step two — "what's this for?" The one real decision the wizard
 * asks about, reusing the same template system already built for
 * ordinary scheme creation rather than inventing new copy or logic.
 *
 * Only the FIXED_PERIOD template (Savings Club) needs a follow-up
 * timing question — OPEN_ENDED schemes get a cycle with no required
 * dates, PROJECT_BASED schemes get theirs automatically on activation.
 */
export function SetupSchemePage() {
  const { navigateToApp } = useTenantNavigation();
  const createScheme = useCreateScheme();
  const activateScheme = useActivateScheme();
  const createCycle = useCreateCycle();
  const cycleTransition = useCycleTransition();

  const [selected, setSelected] = useState<FundTemplateId | null>(null);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate = WIZARD_TEMPLATES.find((t) => t.id === selected);
  const needsTiming = selectedTemplate?.defaults.cycleMode === "FIXED_PERIOD";

  async function handleContinue() {
    if (!selectedTemplate) return;
    if (needsTiming && (!startsOn || !endsOn)) {
      toast.error("Pick both a start and end date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const defaults = getTemplateFormValues(selectedTemplate.id);

      const scheme = await createScheme.mutateAsync({
        name: selectedTemplate.title,
        description: defaults.description,
        cycleMode: defaults.cycleMode!,
        contributionMode: defaults.contributionMode!,
        loanMode: defaults.loanMode!,
        payoutMode: defaults.payoutMode!,
      });

      await activateScheme.mutateAsync(scheme.id);

      if (defaults.cycleMode !== "PROJECT_BASED") {
        const cycle = await createCycle.mutateAsync({
          schemeId: scheme.id,
          values: {
            name: selectedTemplate.title,
            code: "main",
            startsOn: needsTiming ? startsOn : undefined,
            endsOn: needsTiming ? endsOn : undefined,
          },
        });
        await cycleTransition.mutateAsync({ cycleId: cycle.id, transition: "open" });
      }

      toast.success(`${selectedTemplate.title} is ready`);
      navigateToApp("/dashboard");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <div>
        <h1 className="text-xl font-semibold">What's this for?</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Pick the one that's closest — you can always add more later.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {WIZARD_TEMPLATES.map((template) => {
          const isSelected = selected === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelected(template.id)}
              className={`relative rounded-2xl border p-4 text-left transition ${
                isSelected
                  ? "border-[var(--primary)] bg-[var(--secondary)]"
                  : "border-[var(--border)] bg-[var(--card)]"
              }`}
            >
              {isSelected && (
                <CheckCircle2 className="absolute right-4 top-4 size-5 text-[var(--primary)]" />
              )}
              <div className="pr-8 text-sm font-medium">{template.title}</div>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                {template.description}
              </div>
            </button>
          );
        })}
      </div>

      {needsTiming && (
        <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
          <div className="mb-3 text-sm font-medium">
            When does this start, and when does it end?
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Starts
              </label>
              <Input
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
                Ends
              </label>
              <Input
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      <Button
        className="h-12 w-full"
        disabled={!selectedTemplate || isSubmitting}
        onClick={handleContinue}
      >
        {isSubmitting ? "Setting up..." : "Continue"}
      </Button>
    </div>
  );
}
