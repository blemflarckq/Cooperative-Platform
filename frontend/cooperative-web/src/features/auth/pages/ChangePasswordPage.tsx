import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { changePassword } from "@/features/auth/api/auth.api";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useAuth } from "@/lib/auth/AuthContext";
import { setStoredUser } from "@/lib/auth/auth-storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { user, login, token } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      if (user && token) {
        const updatedUser = {
          ...user,
          mustChangePassword: false,
        };

        setStoredUser(updatedUser);

        // Keep the in-memory auth context aligned.
        login({
          accessToken: token,
          refreshToken: localStorage.getItem("coop.refresh_token") ?? "",
          user: updatedUser,
        });
      }

      toast.success("Password changed successfully");
      navigate(`/${tenantSlug}/app/dashboard`, { replace: true });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  function onSubmit(values: FormValues) {
    mutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  }

  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md border-[var(--border)] bg-white">
        <CardHeader>
          <CardTitle className="text-2xl">Change Password</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Update your password before continuing to the platform.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Current Password"
              error={form.formState.errors.currentPassword?.message}
            >
              <Input type="password" {...form.register("currentPassword")} />
            </FormField>

            <FormField
              label="New Password"
              error={form.formState.errors.newPassword?.message}
            >
              <Input type="password" {...form.register("newPassword")} />
            </FormField>

            <FormField
              label="Confirm Password"
              error={form.formState.errors.confirmPassword?.message}
            >
              <Input type="password" {...form.register("confirmPassword")} />
            </FormField>

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Change Password"}
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