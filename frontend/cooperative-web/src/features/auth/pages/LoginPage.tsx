import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { mapAuthenticatedUser } from "@/features/auth/api/auth.mapper";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { useSelectTenant } from "@/features/auth/hooks/useSelectTenant";
import type { TenantOption } from "@/features/auth/types/auth.types";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const loginMutation = useLogin();
  const selectTenantMutation = useSelectTenant();

  const [tenantChoice, setTenantChoice] = useState<{
    preAuthToken: string;
    tenants: TenantOption[];
  } | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/app/dashboard";

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function completeSession(response: {
    accessToken: string;
    refreshToken: string;
    user: Parameters<typeof mapAuthenticatedUser>[0];
  }) {
    const mappedUser = mapAuthenticatedUser(response.user);
    login({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: mappedUser,
    });

    if (mappedUser.mustChangePassword) {
      navigate("/app/change-password", { replace: true });
      return;
    }

    toast.success("Signed in successfully");
    navigate(redirectTo, { replace: true });
  }

  function onSubmit(values: LoginFormValues) {
    loginMutation.mutate(values, {
      onSuccess: (result) => {
        if (result.status === "authenticated") {
          completeSession(result);
          return;
        }

        if (result.status === "select_tenant") {
          setTenantChoice({ preAuthToken: result.preAuthToken, tenants: result.tenants });
          return;
        }

        // status === "no_tenant" — straight into Setup, carrying the
        // pre-auth token so create-tenant can be called without asking
        // for credentials again.
        navigate("/create-tenant", {
          replace: true,
          state: { preAuthToken: result.preAuthToken },
        });
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(error));
      },
    });
  }

  function handleSelectTenant(tenantId: string) {
    if (!tenantChoice) return;

    selectTenantMutation.mutate(
      { preAuthToken: tenantChoice.preAuthToken, tenantId },
      {
        onSuccess: (response) => completeSession(response),
        onError: (error) => toast.error(getApiErrorMessage(error)),
      },
    );
  }

  if (tenantChoice) {
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
              Which cooperative?
            </CardTitle>
            <p className="mt-2 text-sm text-(--muted-foreground)">
              You belong to more than one — pick one to continue.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {tenantChoice.tenants.map((tenant) => (
            <button
              key={tenant.id}
              type="button"
              disabled={selectTenantMutation.isPending}
              onClick={() => handleSelectTenant(tenant.id)}
              className="rounded-xl border border-(--border) px-4 py-3 text-left text-sm font-medium hover:bg-(--secondary) disabled:opacity-50"
            >
              {tenant.name}
            </button>
          ))}
        </CardContent>
      </Card>
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

      <CardContent>
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
        </form>
      </CardContent>
    </Card>
  );
}
