import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useRegister } from "@/features/auth/hooks/useRegister";
import { useAuthResultHandler } from "@/features/auth/hooks/useAuthResultHandler";
import { TenantPicker } from "@/features/auth/components/TenantPicker";

const registerSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.email("Enter a valid email address"),
  mobile: z.string().min(6, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const registerMutation = useRegister();
  const { tenantChoice, handleAuthResult, handleSelectTenant, isSelectingTenant } =
    useAuthResultHandler();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", mobile: "", password: "" },
  });

  function onSubmit(values: RegisterFormValues) {
    registerMutation.mutate(values, {
      onSuccess: handleAuthResult,
      onError: (error) => toast.error(getApiErrorMessage(error)),
    });
  }

  if (tenantChoice) {
    return (
      <TenantPicker
        tenants={tenantChoice.tenants}
        isPending={isSelectingTenant}
        onSelect={handleSelectTenant}
      />
    );
  }

  return (
    <Card className="border-(--border) bg-white shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-(--primary) text-white shadow-sm">
            <Landmark className="size-6" />
          </div>
        </div>

        <div className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Create your account
          </CardTitle>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            The first step to setting up your cooperative on Kopano.
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">First name</label>
              <Input {...form.register("firstName")} />
              {form.formState.errors.firstName ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.firstName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last name</label>
              <Input {...form.register("lastName")} />
              {form.formState.errors.lastName ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.lastName.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-600">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone number</label>
            <Input type="tel" {...form.register("mobile")} />
            {form.formState.errors.mobile ? (
              <p className="text-xs text-red-600">
                {form.formState.errors.mobile.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" {...form.register("password")} />
            {form.formState.errors.password ? (
              <p className="text-xs text-red-600">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? "Creating account..." : "Continue"}
          </Button>

          <p className="text-center text-sm text-(--muted-foreground)">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-(--primary) hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
