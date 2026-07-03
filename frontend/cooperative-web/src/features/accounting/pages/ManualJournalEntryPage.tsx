import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getApiErrorMessage } from "@/lib/api/api-error";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useAccounts } from "../hooks/useAccounts";
import { usePostManualJournalEntry } from "../hooks/usePostManualJournalEntry";
import {
  manualJournalSchema,
  type ManualJournalFormValues,
} from "../schemas/manual-journal.schema";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";

export function ManualJournalEntryPage() {
  const { navigateToApp } = useTenantNavigation();

  const accountsQuery = useAccounts({
    page: 1,
    limit: 500,
    status: "ACTIVE",
  });

  const mutation = usePostManualJournalEntry();

  const form = useForm<ManualJournalFormValues>({
    resolver: zodResolver(manualJournalSchema),
    defaultValues: {
      transactionDate: new Date().toISOString().slice(0, 10),
      description: "",
      sourceReference: "",
      lines: [
        {
          accountId: "",
          lineType: "DEBIT",
          amount: "",
          memo: "",
        },
        {
          accountId: "",
          lineType: "CREDIT",
          amount: "",
          memo: "",
        },
      ],
    },
  });

  const lines = form.watch("lines");
  const accounts = accountsQuery.data?.data ?? [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const totals = useMemo(() => {
    const totalDebits = lines
      .filter((line) => line.lineType === "DEBIT")
      .reduce((sum, line) => sum + Number(line.amount || 0), 0);

    const totalCredits = lines
      .filter((line) => line.lineType === "CREDIT")
      .reduce((sum, line) => sum + Number(line.amount || 0), 0);

    return {
      totalDebits,
      totalCredits,
      difference: totalDebits - totalCredits,
      isBalanced: totalDebits > 0 && totalDebits === totalCredits,
    };
  }, [lines]);

  function handleSubmit(values: ManualJournalFormValues) {
    mutation.mutate(values, {
      onSuccess: (entry) => {
        toast.success("Manual journal entry posted");
        navigateToApp(`/accounting/journal-entries/${entry.id}`);
      },
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Journal Entries", to: "/accounting/journal-entries" },
          { label: "Manual Journal" },
        ]}
      />
      <PageHeader
        title="Manual Journal Entry"
        description="Post a balanced double-entry journal manually. Use this expert workflow for opening balances, corrections, and finance-admin adjustments."
        backTo="/accounting/journal-entries"
        backLabel="Back to Journals"
      />

      {mutation.isError ? (
        <div className="mb-6">
          <ErrorState
            title="Could not post journal entry"
            description={getApiErrorMessage(mutation.error)}
          />
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <Card className="border-[var(--border)] bg-[var(--card)]">
              <CardHeader>
                <CardTitle>Journal Header</CardTitle>
              </CardHeader>

              <CardContent className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Transaction Date"
                  error={form.formState.errors.transactionDate?.message}
                >
                  <Input
                    type="date"
                    {...form.register("transactionDate")}
                  />
                </Field>

                <Field
                  label="Source Reference"
                  error={form.formState.errors.sourceReference?.message}
                >
                  <Input
                    placeholder="Optional reference"
                    {...form.register("sourceReference")}
                  />
                </Field>

                <Field
                  label="Description"
                  error={form.formState.errors.description?.message}
                  className="md:col-span-2"
                >
                  <Input
                    placeholder="Example: Opening balance"
                    {...form.register("description")}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card className="border-[var(--border)] bg-[var(--card)]">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Journal Lines</CardTitle>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Debits and credits must balance before posting.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      accountId: "",
                      lineType: "DEBIT",
                      amount: "",
                      memo: "",
                    })
                  }
                >
                  <Plus className="mr-2 size-4" />
                  Add Line
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-2xl border border-[var(--border)] p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.7fr_0.8fr_auto]">
                      <Field
                        label="Account"
                        error={
                          form.formState.errors.lines?.[index]?.accountId
                            ?.message
                        }
                      >
                        <Select
                          value={form.watch(`lines.${index}.accountId`)}
                          onValueChange={(value) =>
                            form.setValue(`lines.${index}.accountId`, value, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.code} · {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field
                        label="Type"
                        error={
                          form.formState.errors.lines?.[index]?.lineType
                            ?.message
                        }
                      >
                        <Select
                          value={form.watch(`lines.${index}.lineType`)}
                          onValueChange={(value) =>
                            form.setValue(
                              `lines.${index}.lineType`,
                              value as ManualJournalFormValues["lines"][number]["lineType"],
                              {
                                shouldValidate: true,
                                shouldDirty: true,
                              },
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEBIT">Debit</SelectItem>
                            <SelectItem value="CREDIT">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field
                        label="Amount"
                        error={
                          form.formState.errors.lines?.[index]?.amount?.message
                        }
                      >
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...form.register(`lines.${index}.amount`)}
                        />
                      </Field>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={fields.length <= 2}
                          onClick={() => remove(index)}
                          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Field
                        label="Memo"
                        error={
                          form.formState.errors.lines?.[index]?.memo?.message
                        }
                      >
                        <Input
                          placeholder="Optional line memo"
                          {...form.register(`lines.${index}.memo`)}
                        />
                      </Field>
                    </div>
                  </div>
                ))}

                {form.formState.errors.lines?.message ? (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.lines.message}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit border-[var(--border)] bg-white">
            <CardHeader>
              <CardTitle>Balance Check</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <SummaryRow
                label="Total Debits"
                value={formatCurrency(totals.totalDebits)}
              />
              <SummaryRow
                label="Total Credits"
                value={formatCurrency(totals.totalCredits)}
              />
              <SummaryRow
                label="Difference"
                value={formatCurrency(Math.abs(totals.difference))}
              />

              {totals.isBalanced ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Balanced. This journal can be posted.
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Debits and credits must be equal before posting.
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  mutation.isPending ||
                  accountsQuery.isLoading ||
                  !totals.isBalanced
                }
              >
                {mutation.isPending ? "Posting..." : "Post Journal Entry"}
              </Button>
            </CardContent>
          </Card>
        </div>
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
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--foreground)]">
        {value}
      </span>
    </div>
  );
}