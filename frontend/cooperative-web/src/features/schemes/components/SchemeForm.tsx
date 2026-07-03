import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { cn } from "@/lib/utils/cn";

import { schemeSchema, type SchemeFormValues } from "../schemas/scheme.schema";
import {
  getContributionModeFieldLabel,
  getContributionModeOptionLabels,
  getCycleModeFieldLabel,
  getCycleModeOptionLabels,
  getLoanModeFieldLabel,
  getLoanModeOptionLabels,
  getPayoutModeFieldLabel,
  getPayoutModeOptionLabels,
} from "../utils/scheme-mode-labels";
import { FundRulesPreviewCard } from "./FundRulesPreviewCard";
import { SchemeModeOptionPicker } from "./SchemeModeOptionPicker";

const cycleModeOptions = ["FIXED_PERIOD", "OPEN_ENDED", "PROJECT_BASED"] as const;

const contributionModeOptions = [
  "MONTHLY_FIXED",
  "EVENT_TRIGGERED",
  "VOLUNTARY",
  "PROJECT_TARGET",
] as const;

const loanModeOptions = [
  "DISABLED",
  "SELF_BACKED",
  "PEER_FUNDED",
  "SELF_AND_PEER_FUNDED",
] as const;

const payoutModeOptions = [
  "END_OF_CYCLE",
  "NO_PAYOUT",
  "EVENT_BENEFICIARY",
  "PROJECT_EXPENSE",
] as const;

const baseDefaultValues: SchemeFormValues = {
  name: "",
  code: "",
  description: "",
  cycleMode: "FIXED_PERIOD",
  contributionMode: "MONTHLY_FIXED",
  loanMode: "DISABLED",
  payoutMode: "END_OF_CYCLE",
};

interface SchemeFormProps {
  defaultValues?: Partial<SchemeFormValues>;
  onSubmit: (values: SchemeFormValues) => Promise<void> | void;
  isLoading?: boolean;
  submitLabel?: string;
  sideContent?: ReactNode;
}

export function SchemeForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = "Save",
  sideContent,
}: SchemeFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { mode, isCommunityMode } = useExperienceMode();

  const form = useForm<SchemeFormValues>({
    resolver: zodResolver(schemeSchema),
    defaultValues: {
      ...baseDefaultValues,
      ...defaultValues,
    },
  });

  const { reset } = form;

  useEffect(() => {
    reset({
      ...baseDefaultValues,
      ...defaultValues,
    });
  }, [defaultValues, reset]);

  const cycleModeField = getCycleModeFieldLabel(mode);
  const contributionModeField = getContributionModeFieldLabel(mode);
  const loanModeField = getLoanModeFieldLabel(mode);
  const payoutModeField = getPayoutModeFieldLabel(mode);

  const cycleModeLabels = getCycleModeOptionLabels(mode);
  const contributionModeLabels = getContributionModeOptionLabels(mode);
  const loanModeLabels = getLoanModeOptionLabels(mode);
  const payoutModeLabels = getPayoutModeOptionLabels(mode);

  const selectedCycleMode = form.watch("cycleMode");
  const selectedContributionMode = form.watch("contributionMode");
  const selectedLoanMode = form.watch("loanMode");
  const selectedPayoutMode = form.watch("payoutMode");

  const previewValues: Partial<SchemeFormValues> = {
    cycleMode: selectedCycleMode,
    contributionMode: selectedContributionMode,
    loanMode: selectedLoanMode,
    payoutMode: selectedPayoutMode,
  };

  const resolvedSideContent =
    sideContent ??
    (isCommunityMode ? <FundRulesPreviewCard values={previewValues} /> : null);

  return (
    <div
      className={cn(
        resolvedSideContent
          ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
          : "max-w-4xl",
      )}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle className="text-lg">
              {isCommunityMode ? "Fund Details" : "Scheme Configuration"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} />
              </Field>

              <Field
                label="Description"
                error={form.formState.errors.description?.message}
                className="md:col-span-2"
              >
                <Input {...form.register("description")} />
              </Field>

              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvanced((current) => !current)}
                  className="px-0 text-[var(--primary)]"
                >
                  {showAdvanced
                    ? "Hide advanced options"
                    : "Show advanced options"}
                </Button>

                {showAdvanced ? (
                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
                    <Field
                      label={isCommunityMode ? "Fund Code" : "Scheme Code"}
                      error={form.formState.errors.code?.message}
                    >
                      <Input
                        placeholder="Leave blank to auto-generate"
                        {...form.register("code")}
                      />
                    </Field>

                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Leave blank unless you need a custom stable identifier for
                      imports, reports, or integrations.
                    </p>
                  </div>
                ) : null}
              </div>

              <ModeField
                label={cycleModeField.label}
                description={cycleModeField.description}
                error={form.formState.errors.cycleMode?.message}
              >
                <SchemeModeOptionPicker
                  value={selectedCycleMode}
                  options={[...cycleModeOptions]}
                  labels={cycleModeLabels}
                  onChange={(value) =>
                    form.setValue(
                      "cycleMode",
                      value as SchemeFormValues["cycleMode"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                />
              </ModeField>

              <ModeField
                label={contributionModeField.label}
                description={contributionModeField.description}
                error={form.formState.errors.contributionMode?.message}
              >
                <SchemeModeOptionPicker
                  value={selectedContributionMode}
                  options={[...contributionModeOptions]}
                  labels={contributionModeLabels}
                  onChange={(value) =>
                    form.setValue(
                      "contributionMode",
                      value as SchemeFormValues["contributionMode"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                />
              </ModeField>

              <ModeField
                label={loanModeField.label}
                description={loanModeField.description}
                error={form.formState.errors.loanMode?.message}
              >
                <SchemeModeOptionPicker
                  value={selectedLoanMode}
                  options={[...loanModeOptions]}
                  labels={loanModeLabels}
                  onChange={(value) =>
                    form.setValue(
                      "loanMode",
                      value as SchemeFormValues["loanMode"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                />
              </ModeField>

              <ModeField
                label={payoutModeField.label}
                description={payoutModeField.description}
                error={form.formState.errors.payoutMode?.message}
              >
                <SchemeModeOptionPicker
                  value={selectedPayoutMode}
                  options={[...payoutModeOptions]}
                  labels={payoutModeLabels}
                  onChange={(value) =>
                    form.setValue(
                      "payoutMode",
                      value as SchemeFormValues["payoutMode"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                />
              </ModeField>
            </div>

            <div className="flex justify-end border-t border-[var(--border)] pt-5">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : submitLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {resolvedSideContent ? (
        <aside className="xl:sticky xl:top-24 xl:self-start">
          {resolvedSideContent}
        </aside>
      ) : null}
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      <div className="mt-2">{children}</div>

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function ModeField({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 md:col-span-2">
      <div>
        <label className="text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>

        {description ? (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>

      {children}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}