import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { useCreateAccountingPeriod } from "../hooks/useCreateAccountingPeriod";
import {
  accountingPeriodSchema,
  type AccountingPeriodFormValues,
} from "../schemas/accounting-period.schema";

export function CreateAccountingPeriodPage() {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  const mutation = useCreateAccountingPeriod();

  const form = useForm<AccountingPeriodFormValues>({
    resolver: zodResolver(accountingPeriodSchema),
    defaultValues: {
      name: "",
      startsOn: "",
      endsOn: "",
    },
  });

  function handleSubmit(values: AccountingPeriodFormValues) {
    mutation.mutate(values, {
      onSuccess: () => {
        toast.success("Accounting period created");
        navigate(appPath("/accounting/periods"));
      },
    });
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Accounting Periods", to: "/accounting/periods" },
          { label: "Create Period" },
        ]}
      />

      <PageHeader
        title="Create Accounting Period"
        description="Define a financial reporting period for accounting controls and reports."
        backTo="/accounting/periods"
        backLabel="Back to Periods"
      />

      {mutation.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Could not create accounting period"
            description={getApiErrorMessage(mutation.error)}
          />
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-3xl">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>Period Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <Field label="Name" error={form.formState.errors.name?.message}>
              <Input
                placeholder="2026 Financial Year"
                {...form.register("name")}
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
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
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Periods help treasurers and auditors understand which financial
              activities belong to each reporting window.
            </div>

            <div className="flex justify-end border-t border-[var(--border)] pt-5">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Period"}
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
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}