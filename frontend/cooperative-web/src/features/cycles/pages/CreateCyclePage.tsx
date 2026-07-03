import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import {
  cycleSchema,
  type CycleFormInput,
  type CycleFormValues,
} from "../schemas/cycle.schema";

import { useCreateCycle } from "../hooks/useCreateCycle";
import { useState } from "react";

export function CreateCyclePage() {

  const [showAdvanced, setShowAdvanced] = useState(false);
  const { schemeId } = useParams<{ schemeId: string }>();

  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  const mutation = useCreateCycle();

  const form = useForm<CycleFormInput, unknown, CycleFormValues>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
        name: "",
        code: "",
        startsOn: "",
        endsOn: "",
        targetAmount: "",
    },
    });

    function cleanCyclePayload(values: CycleFormValues) {
      return {
        ...values,
        code: values.code?.trim() ?? "",
        startsOn: values.startsOn || undefined,
        endsOn: values.endsOn || undefined,
        targetAmount: values.targetAmount,
      };
    }

  function handleSubmit(values: CycleFormValues) {
    mutation.mutate(
      {
        schemeId: schemeId!,
        values: cleanCyclePayload(values),
      },
      {
        onSuccess: (cycle) => {
          toast.success("Cycle created successfully");

          navigate(appPath(`/cycles/${cycle.id}`));
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        title="Create Operating Cycle"
        description="Create a financial operating cycle under this cooperative scheme."
        backTo={`/schemes/${schemeId}`}
        backLabel="Back to Scheme"
      />

      {mutation.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Could not create cycle"
            description={getApiErrorMessage(mutation.error)}
          />
        </div>
      ) : null}

      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="max-w-4xl"
      >
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>Cycle Configuration</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Cycle Name"
                error={form.formState.errors.name?.message}
              >
                <Input {...form.register("name")} />
              </Field>

              <Field
                label="Start Date"
                error={form.formState.errors.startsOn?.message}
              >
                <Input type="date" {...form.register("startsOn")} />
              </Field>

              <Field
                label="End Date"
                error={form.formState.errors.endsOn?.message}
              >
                <Input type="date" {...form.register("endsOn")} />
              </Field>

              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAdvanced((current) => !current)}
                  className="px-0 text-[var(--primary)]"
                >
                  {showAdvanced ? "Hide advanced options" : "Show advanced options"}
                </Button>

                {showAdvanced ? (
                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
                    <Field label="Cycle Code" error={form.formState.errors.code?.message}>
                      <Input
                        placeholder="Leave blank to auto-generate"
                        {...form.register("code")}
                      />
                    </Field>

                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Leave blank unless you need a custom cycle identifier for imports,
                      reports, or integrations.
                    </p>
                  </div>
                ) : null}
              </div>

              <Field
                label="Target Amount"
                error={form.formState.errors.targetAmount?.message}
                className="md:col-span-2"
              >
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("targetAmount")}
                />
              </Field>
            </div>

            <div className="flex justify-end border-t border-[var(--border)] pt-5">
              <Button
                type="submit"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Creating..." : "Create Cycle"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
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
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      <div className="mt-2">{children}</div>

      {error ? (
        <p className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}