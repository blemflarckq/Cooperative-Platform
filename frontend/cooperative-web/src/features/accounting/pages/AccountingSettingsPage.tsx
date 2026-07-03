import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
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
import { useAccounts } from "../hooks/useAccounts";
import { useAccountingSettings } from "../hooks/useAccountingSettings";
import { useProvisionAccountingDefaults } from "../hooks/useProvisionAccountingDefaults";
import { useUpdateAccountingSettings } from "../hooks/useUpdateAccountingSettings";
import {
  accountingSettingsSchema,
  type AccountingSettingsFormValues,
} from "../schemas/accounting-settings.schema";
import { type Account } from "../types/accounting.types";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";

export function AccountingSettingsPage() {
  const [cashAccountName, setCashAccountName] = useState("Cash at Bank");

  const settingsQuery = useAccountingSettings();

  const accountsQuery = useAccounts({
    page: 1,
    limit: 500,
    status: "ACTIVE",
  });

  const provisionMutation = useProvisionAccountingDefaults();
  const updateMutation = useUpdateAccountingSettings();

  const form = useForm<AccountingSettingsFormValues>({
    resolver: zodResolver(accountingSettingsSchema),
    defaultValues: {
      cashAccountId: "",
      memberSavingsLiabilityAccountId: "",
      loanReceivableAccountId: "",
      interestIncomeAccountId: "",
      penaltyIncomeAccountId: "",
    },
  });

  const settings = settingsQuery.data;
  const accounts = accountsQuery.data?.data ?? [];

  useEffect(() => {
    if (!settings) return;

    form.reset({
      cashAccountId: settings.cashAccountId ?? "",
      memberSavingsLiabilityAccountId:
        settings.memberSavingsLiabilityAccountId ?? "",
      loanReceivableAccountId: settings.loanReceivableAccountId ?? "",
      interestIncomeAccountId: settings.interestIncomeAccountId ?? "",
      penaltyIncomeAccountId: settings.penaltyIncomeAccountId ?? "",
    });
  }, [settings, form]);

  if (settingsQuery.isLoading || accountsQuery.isLoading) return <LoadingState />;

  if (settingsQuery.isError) {
    return <ErrorState title="Could not load accounting settings" />;
  }

  if (accountsQuery.isError) {
    return <ErrorState title="Could not load accounts" />;
  }

  const isIncomplete =
    !settings?.cashAccountId ||
    !settings.memberSavingsLiabilityAccountId ||
    !settings.loanReceivableAccountId ||
    !settings.interestIncomeAccountId ||
    !settings.penaltyIncomeAccountId;

  function handleSubmit(values: AccountingSettingsFormValues) {
    updateMutation.mutate(values, {
      onSuccess: () => toast.success("Accounting settings updated"),
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  }

  function filterAccounts(type: Account["type"]) {
    return accounts.filter((account) => account.type === type);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Accounting Settings" },
        ]}
      />
      <PageHeader
        title="Accounting Settings"
        description="Configure the system accounts used for contributions, loans, interest, and penalties."
      />

      {isIncomplete ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Accounting setup is incomplete. Contributions and financial postings
          may fail until all required accounts are configured.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader>
              <CardTitle>Configured Posting Accounts</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <SettingsSelect
                label="Cash / Bank Account"
                description="Debited when a contribution is received."
                value={form.watch("cashAccountId")}
                error={form.formState.errors.cashAccountId?.message}
                accounts={filterAccounts("ASSET")}
                onChange={(value) =>
                  form.setValue("cashAccountId", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />

              <SettingsSelect
                label="Member Savings Liability"
                description="Credited when a member contribution increases savings."
                value={form.watch("memberSavingsLiabilityAccountId")}
                error={
                  form.formState.errors.memberSavingsLiabilityAccountId?.message
                }
                accounts={filterAccounts("LIABILITY")}
                onChange={(value) =>
                  form.setValue("memberSavingsLiabilityAccountId", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />

              <SettingsSelect
                label="Loan Receivable"
                description="Asset account used when member loans are issued."
                value={form.watch("loanReceivableAccountId")}
                error={form.formState.errors.loanReceivableAccountId?.message}
                accounts={filterAccounts("ASSET")}
                onChange={(value) =>
                  form.setValue("loanReceivableAccountId", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />

              <SettingsSelect
                label="Interest Income"
                description="Income account used for loan interest."
                value={form.watch("interestIncomeAccountId")}
                error={form.formState.errors.interestIncomeAccountId?.message}
                accounts={filterAccounts("INCOME")}
                onChange={(value) =>
                  form.setValue("interestIncomeAccountId", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />

              <SettingsSelect
                label="Penalty Income"
                description="Income account used for penalties and fees."
                value={form.watch("penaltyIncomeAccountId")}
                error={form.formState.errors.penaltyIncomeAccountId?.message}
                accounts={filterAccounts("INCOME")}
                onChange={(value) =>
                  form.setValue("penaltyIncomeAccountId", value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />

              {updateMutation.isError ? (
                <ErrorState
                  title="Could not update accounting settings"
                  description={getApiErrorMessage(updateMutation.error)}
                />
              ) : null}

              <div className="flex justify-end border-t border-[var(--border)] pt-5">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || !form.formState.isDirty}
                >
                  <Save className="mr-2 size-4" />
                  {updateMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <Card className="h-fit border-[var(--border)] bg-white">
          <CardHeader>
            <CardTitle>Guided Setup</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              Provisioning creates the standard system accounts required for
              contributions, loans, interest, and penalties.
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">
                Default cash account name
              </label>
              <Input
                value={cashAccountName}
                onChange={(event) => setCashAccountName(event.target.value)}
                className="mt-2"
              />
            </div>

            {provisionMutation.isError ? (
              <ErrorState
                title="Could not provision defaults"
                description={getApiErrorMessage(provisionMutation.error)}
              />
            ) : null}

            <ConfirmActionDialog
              title="Provision default accounting accounts?"
              description="This will create and configure default system accounts. Existing configured defaults may be updated by the backend."
              confirmLabel="Provision Defaults"
              loadingLabel="Provisioning..."
              isLoading={provisionMutation.isPending}
              onConfirm={() =>
                provisionMutation.mutate(
                  { cashAccountName },
                  {
                    onSuccess: () =>
                      toast.success("Default accounts provisioned"),
                    onError: (error) =>
                      toast.error(getApiErrorMessage(error)),
                  },
                )
              }
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  disabled={provisionMutation.isPending}
                  className="w-full"
                >
                  Provision Defaults
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface SettingsSelectProps {
  label: string;
  description: string;
  value: string;
  error?: string;
  accounts: Account[];
  onChange: (value: string) => void;
}

function SettingsSelect({
  label,
  description,
  value,
  error,
  accounts,
  onChange,
}: SettingsSelectProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-4">
      <div className="mb-3">
        <p className="font-medium text-[var(--foreground)]">{label}</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          {description}
        </p>
      </div>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.length === 0 ? (
            <SelectItem value="__none" disabled>
              No active accounts available
            </SelectItem>
          ) : (
            accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.code} · {account.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}