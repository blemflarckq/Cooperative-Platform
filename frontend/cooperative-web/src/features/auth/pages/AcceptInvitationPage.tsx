import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Landmark } from "lucide-react";
import { acceptInvitation } from "@/features/auth/api/auth.api";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => searchParams.get("token"), [searchParams]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: (response) => {
      localStorage.setItem("last_tenant_slug", response.tenantSlug);
      toast.success("Invitation accepted. You can now sign in.");
      navigate(`/${response.tenantSlug}/login`, { replace: true });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  if (!token) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md border-[var(--border)] bg-white">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              This invitation link is invalid or missing a token.
            </p>

            <Button
              type="button"
              onClick={() => navigate("/")}
              className="w-full"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  function onSubmit(values: FormValues) {
    if (!token) {
      return;
    }

    mutation.mutate({
      token,
      password: values.password,
    });
  }

  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-[var(--border)] bg-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-white">
            <Landmark className="size-6" />
          </div>
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Create your password to activate your cooperative account.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Password"
              error={form.formState.errors.password?.message}
            >
              <Input type="password" {...form.register("password")} />
            </FormField>

            <FormField
              label="Confirm Password"
              error={form.formState.errors.confirmPassword?.message}
            >
              <Input type="password" {...form.register("confirmPassword")} />
            </FormField>

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || !token}
            >
              {mutation.isPending ? "Activating..." : "Activate Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
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