import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";

import { toast } from "sonner";
import { useLocation } from "react-router";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { mapAuthenticatedUser } from "@/features/auth/api/auth.mapper";
import { useLogin } from "@/features/auth/hooks/useLogin";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  //email: z.email("test@email.com"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  //password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const loginMutation = useLogin();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  /*const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/app/dashboard";
*/
  const redirectTo =
  (location.state as { from?: string } | null)?.from ??
  `/${tenantSlug}/app/dashboard`;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginFormValues) {
    const loginPayload = {
      ...values,
      tenantSlug: tenantSlug, 
    };
  loginMutation.mutate(loginPayload, {
    onSuccess: (response) => {
      //console.log("This is the current response", response)
      const mappedUser = mapAuthenticatedUser(response.user);
      localStorage.setItem('last_tenant_slug', tenantSlug!);
      login({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: mappedUser,
      });

      if (mappedUser.mustChangePassword) {
        navigate(`/${tenantSlug}/app/change-password`, { replace: true });
        //navigate("change-password", { replace: true });
        return;
      }

      toast.success("Signed in successfully");
      navigate(redirectTo, { replace: true });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
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