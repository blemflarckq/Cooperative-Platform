import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  tenantUserSchema,
  type TenantUserFormValues,
} from "@/features/tenant-users/schemas/tenant-user.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TenantUserFormProps {
  defaultValues?: Partial<TenantUserFormValues>;
  onSubmit: (values: TenantUserFormValues) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function TenantUserForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = "Save Member",
}: TenantUserFormProps) {
  const form = useForm<TenantUserFormValues>({
    resolver: zodResolver(tenantUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl">
      <Card className="border-border bg-white">
        <CardHeader>
          <CardTitle className="text-lg">User Identity</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                First Name
              </label>
              <Input {...form.register("firstName")} />
              {form.formState.errors.firstName ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.firstName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Last Name
              </label>
              <Input {...form.register("lastName")} />
              {form.formState.errors.lastName ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.lastName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input type="email" {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end border-t border-border pt-5">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : submitLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}