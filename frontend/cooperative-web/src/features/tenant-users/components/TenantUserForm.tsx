import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  tenantUserSchema,
  type TenantUserFormValues,
} from "@/features/tenant-users/schemas/tenant-user.schema";

interface TenantUserFormProps {
  defaultValues?: Partial<TenantUserFormValues>;
  onSubmit: (values: TenantUserFormValues) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

/**
 * A member's name — first and last. Nothing else is editable here:
 * email and phone are how people sign in, and deactivating has its own
 * safeguarded route.
 */
export function TenantUserForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = "Save changes",
}: TenantUserFormProps) {
  const form = useForm<TenantUserFormValues>({
    resolver: zodResolver(tenantUserSchema),
    defaultValues: { firstName: "", lastName: "", ...defaultValues },
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Card className="gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="text-sm font-medium">
            First name
          </label>
          <Input id="firstName" autoComplete="off" {...form.register("firstName")} />
          {errors.firstName ? (
            <p className="text-xs text-[var(--destructive)]">{errors.firstName.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="lastName" className="text-sm font-medium">
            Last name
          </label>
          <Input id="lastName" autoComplete="off" {...form.register("lastName")} />
          {errors.lastName ? (
            <p className="text-xs text-[var(--destructive)]">{errors.lastName.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving…" : submitLabel}
          </Button>
        </div>
      </Card>
    </form>
  );
}
