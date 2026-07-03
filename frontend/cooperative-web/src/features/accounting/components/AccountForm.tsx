import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountSchema, type AccountFormValues } from "../schemas/account.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountFormProps {
  onSubmit: (values: AccountFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function AccountForm({
  onSubmit,
  isLoading,
  submitLabel = "Save Account",
}: AccountFormProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      type: "ASSET",
      normalBalance: "DEBIT",
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl">
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            *Hint* Account codes control ordering in accounting reports. Use defaults like 1000
            for assets, 2000 for liabilities, 4000 for income.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Code" error={form.formState.errors.code?.message}>
              <Input placeholder="1200" {...form.register("code")} />
            </Field>

            <Field label="Name" error={form.formState.errors.name?.message}>
              <Input placeholder="Mobile Money Wallet" {...form.register("name")} />
            </Field>

            <Field
              label="Description"
              error={form.formState.errors.description?.message}
              className="md:col-span-2"
            >
              <Input {...form.register("description")} />
            </Field>

            <Field label="Account Type">
              <Select
                value={form.watch("type")}
                onValueChange={(value) =>
                  form.setValue("type", value as AccountFormValues["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSET">Asset</SelectItem>
                  <SelectItem value="LIABILITY">Liability</SelectItem>
                  <SelectItem value="EQUITY">Equity</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Normal Balance">
              <Select
                value={form.watch("normalBalance")}
                onValueChange={(value) =>
                  form.setValue(
                    "normalBalance",
                    value as AccountFormValues["normalBalance"],
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
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            For standard accounting: assets and expenses normally use debit
            balances; liabilities, equity and income normally use credit balances.
          </div>

          <div className="flex justify-end border-t border-[var(--border)] pt-5">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : submitLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
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