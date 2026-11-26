import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { cn } from "@/lib/utils/cn";

import { useSchemeWords } from "../hooks/useSchemeWords";
import { schemeSchema, type SchemeFormValues } from "../schemas/scheme.schema";
import type { SchemeModeField } from "../types/scheme.types";
import { getModeHeading, getModeOptions, MODE_FIELDS } from "../utils/scheme-mode-labels";
import { SchemeModeOptionPicker } from "./SchemeModeOptionPicker";
import { SchemeRulesList } from "./SchemeRulesList";

const cardClass =
  "gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0";

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
  /**
   * True once the scheme has been activated: its code and four rules are
   * fixed (cycles, contributions and loans are built on them), so they are
   * shown, not offered. The server refuses the change either way.
   */
  structureLocked?: boolean;
  /** Start with the rules open for choosing — for a custom setup, or anyone who'd rather see the options. */
  rulesOpen?: boolean;
  submitLabel: string;
  savingLabel: string;
  isLoading?: boolean;
  /** Editing: the save button stays idle until something has changed, and says so. */
  requireChange?: boolean;
  onSubmit: (values: SchemeFormValues, changed: Array<keyof SchemeFormValues>) => void;
  onCancel: () => void;
}

/**
 * Create and edit share this form. Two always-editable fields (name,
 * description), the four rules, and an optional code. The rules appear as
 * a plain summary that updates as choices are made, so the consequence of
 * a change is visible before saving.
 */
export function SchemeForm({
  defaultValues,
  structureLocked = false,
  rulesOpen = false,
  submitLabel,
  savingLabel,
  isLoading,
  requireChange = false,
  onSubmit,
  onCancel,
}: SchemeFormProps) {
  const { mode } = useExperienceMode();
  const { noun } = useSchemeWords();
  const [choosingRules, setChoosingRules] = useState(rulesOpen);
  const [customCode, setCustomCode] = useState(Boolean(defaultValues?.code) && !structureLocked);

  const form = useForm<SchemeFormValues>({
    resolver: zodResolver(schemeSchema),
    defaultValues: { ...baseDefaultValues, ...defaultValues },
  });
  const { errors, isDirty, dirtyFields } = form.formState;

  const watched = form.watch();
  const rules: Record<SchemeModeField, string> = {
    cycleMode: watched.cycleMode,
    contributionMode: watched.contributionMode,
    loanMode: watched.loanMode,
    payoutMode: watched.payoutMode,
  };

  function setRule(field: SchemeModeField, value: string) {
    form.setValue(field, value as never, { shouldDirty: true, shouldValidate: true });
  }

  function handleSubmit(values: SchemeFormValues) {
    const changed = (Object.keys(dirtyFields) as Array<keyof SchemeFormValues>).filter(
      (key) => dirtyFields[key],
    );
    onSubmit(values, changed);
  }

  const idleBecauseUnchanged = requireChange && !isDirty;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="grid gap-4">
      <Card className={cardClass}>
        <h2 className="text-sm font-medium">About it</h2>

        <Field label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="off" {...form.register("name")} />
        </Field>

        <Field
          label="What it's for"
          htmlFor="description"
          error={errors.description?.message}
          hint="Optional. A line or two members will see."
        >
          <textarea
            id="description"
            rows={3}
            className={cn(
              "flex w-full rounded-xl border border-[var(--input)] bg-white px-3 py-2 text-sm text-[var(--foreground)] shadow-sm transition",
              "placeholder:text-[var(--muted-foreground)] hover:border-[var(--primary)]/60",
              "focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)]/15",
              "dark:bg-[var(--card)]",
            )}
            {...form.register("description")}
          />
        </Field>
      </Card>

      <Card className={cardClass}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">How it works</h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              {structureLocked
                ? "Fixed now that it has been activated."
                : choosingRules
                  ? `Pick how this ${noun} runs.`
                  : "From the type you picked. Change any of it if your group does things differently."}
            </p>
          </div>
          {structureLocked ? <Lock className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" /> : null}
        </div>

        {structureLocked ? (
          <>
            <SchemeRulesList values={rules} />
            <p className="border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted-foreground)]">
              Its cycles, contributions and loans are built on these, so they can't change. The name
              and description can. To run things differently, create a new {noun}.
            </p>
            {defaultValues?.code ? (
              <div>
                <div className="text-xs text-[var(--muted-foreground)]">Code</div>
                <div className="mt-0.5 break-all text-sm font-medium">{defaultValues.code}</div>
              </div>
            ) : null}
          </>
        ) : choosingRules ? (
          <div className="grid gap-5">
            {MODE_FIELDS.map((field) => (
              <div key={field} className="grid gap-2">
                <div className="text-sm font-medium">{getModeHeading(mode, field)}</div>
                <SchemeModeOptionPicker
                  label={getModeHeading(mode, field)}
                  value={rules[field]}
                  options={getModeOptions(mode, field)}
                  onChange={(value) => setRule(field, value)}
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>
        ) : (
          <>
            <SchemeRulesList values={rules} />
            <div>
              <Button type="button" variant="outline" onClick={() => setChoosingRules(true)}>
                Change the rules
              </Button>
            </div>
          </>
        )}
      </Card>

      {!structureLocked ? (
        <Card className={cardClass}>
          {customCode ? (
            <Field
              label="Code"
              htmlFor="code"
              error={errors.code?.message}
              hint="A short stable name for imports and reports. It can't be changed once activated. Leave it blank to make one from the name."
            >
              <Input id="code" autoComplete="off" {...form.register("code")} />
            </Field>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium">Code</h2>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  Made from the name unless you set your own.
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setCustomCode(true)}>
                Set my own
              </Button>
            </div>
          )}
        </Card>
      ) : null}

      {idleBecauseUnchanged ? (
        <p className="text-xs text-[var(--muted-foreground)]">Change something to save it.</p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || idleBecauseUnchanged}>
          {isLoading ? savingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--destructive)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
