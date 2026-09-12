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
import { useLogin } from "@/features/auth/hooks/useLogin";
import { useAuthResultHandler } from "@/features/auth/hooks/useAuthResultHandler";
import { TenantPicker } from "@/features/auth/components/TenantPicker";
import { OAuthButtons } from "@/features/auth/components/OAuthButtons";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const loginMutation = useLogin();
  const { tenantChoice, handleAuthResult, handleSelectTenant, isSelectingTenant } =
    useAuthResultHandler();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values, {
      onSuccess: (result) => handleAuthResult(result),
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
            Sign in
          </CardTitle>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            Access the cooperative administration platform.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <OAuthButtons />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-(--border)" />
          <span className="text-xs text-(--muted-foreground)">or</span>
          <div className="h-px flex-1 bg-(--border)" />
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <label className="text-sm font-medium">Password</label>
            <Input type="password" {...form.register("password")} />
            {form.formState.errors.password ? (
              <p className="text-xs text-red-600">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Signing in..." : "Continue"}
          </Button>

          <p className="text-center text-sm text-(--muted-foreground)">
            New here?{" "}
            <Link to="/register" className="font-medium text-(--primary) hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
