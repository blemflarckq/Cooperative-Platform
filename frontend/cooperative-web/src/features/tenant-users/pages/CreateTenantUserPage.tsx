import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, KeyRound, Copy, ExternalLink, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";
import {
  createTenantUserInvitation,
  createTenantUserWithTempPassword,
} from "@/features/tenant-users/api/tenant-user-enrollment.api";
import {
  tenantUserEnrollmentSchema,
  type TenantUserEnrollmentFormValues,
} from "@/features/tenant-users/schemas/tenant-user-enrollment.schema";
import type { CreateInvitationResponse } from "@/features/tenant-users/types/tenant-user-enrollment.types";

export function CreateTenantUserPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { appPath } = useTenantNavigation();
  const [createdInvitation, setCreatedInvitation] =
  useState<CreateInvitationResponse | null>(null);

  const form = useForm<TenantUserEnrollmentFormValues>({
    resolver: zodResolver(tenantUserEnrollmentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
       mobile: "",
      enrollmentMethod: "invitation",
      temporaryPassword: "",
      roleIds: [],
    },
  });

  const selectedMethod = form.watch("enrollmentMethod");

  const invitationMutation = useMutation({
    mutationFn: createTenantUserInvitation,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.lists(),
      });

      setCreatedInvitation(response);
      toast.success("Invitation created successfully");
      //navigate(appPath(`/members/${response.tenantUserId}`));
    },
  });

  const tempPasswordMutation = useMutation({
    mutationFn: createTenantUserWithTempPassword,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: tenantUserQueryKeys.lists(),
      });

      toast.success("Temporary password user created");
      navigate(appPath(`/members/${response.tenantUserId}`));
    },
  });

  const isSubmitting =
    invitationMutation.isPending || tempPasswordMutation.isPending;

  const error = invitationMutation.error ?? tempPasswordMutation.error;

  function parseRoleIds(raw: string): string[] {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function handleSubmit(values: TenantUserEnrollmentFormValues) {
    const roleIds = values.roleIds ?? [];

    if (values.enrollmentMethod === "invitation") {
      invitationMutation.mutate({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        mobile: values.mobile,
        roleIds,
      });
      return;
    }

    tempPasswordMutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      mobile: values.mobile,
      temporaryPassword: values.temporaryPassword!,
      roleIds,
    });
  }

  return (
    <div>
      <PageHeader
        title="Add Member"
        description="Create a tenant membership using invitation or temporary-password onboarding."
        backTo="/members"
        backLabel="Back to Members"
      />

      {error ? (
        <div className="mb-6">
          <ErrorState
            title="Could not create member"
            description={getApiErrorMessage(error)}
          />
        </div>
      ) : null}

      {createdInvitation ? (
        <InvitationCreatedCard
          invitation={createdInvitation}
          onViewMember={() =>
            navigate(appPath(`/members/${createdInvitation.tenantUserId}`))
          }
          onBackToMembers={() => navigate(appPath("/members"))}
        />
      ) : null}

      {!createdInvitation ? (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-4xl">
          <Card className="border-(--border) bg-white">
            <CardHeader>
              <CardTitle className="text-lg">User Identity</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="First Name" error={form.formState.errors.firstName?.message}>
                  <Input {...form.register("firstName")} />
                </FormField>

                <FormField label="Last Name" error={form.formState.errors.lastName?.message}>
                  <Input {...form.register("lastName")} />
                </FormField>

                <FormField
                  label="Email"
                  error={form.formState.errors.email?.message}
                  className="md:col-span-2"
                >
                  <Input type="email" {...form.register("email")} />
                </FormField>
                <FormField
                  label="Mobile Number"
                  error={form.formState.errors.mobile?.message}
                  className="md:col-span-2"
                >
                  <Input
                    placeholder="+26658000000"
                    {...form.register("mobile")}
                  />
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Use international format. Local Lesotho numbers can be entered without +266.
                  </p>
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6 border-(--border) bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Enrollment Method</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <EnrollmentCard
                  icon={<Mail className="size-5" />}
                  title="Send Invitation"
                  description="The member receives an invitation and creates their own password."
                  active={selectedMethod === "invitation"}
                  onClick={() => form.setValue("enrollmentMethod", "invitation")}
                />

                <EnrollmentCard
                  icon={<KeyRound className="size-5" />}
                  title="Temporary Password"
                  description="Create temporary credentials. The member must change password on first login."
                  active={selectedMethod === "temporary-password"}
                  onClick={() =>
                    form.setValue("enrollmentMethod", "temporary-password")
                  }
                />
              </div>

              {selectedMethod === "temporary-password" ? (
                <FormField
                  label="Temporary Password"
                  error={form.formState.errors.temporaryPassword?.message}
                >
                  <Input
                    type="password"
                    {...form.register("temporaryPassword")}
                  />
                </FormField>
              ) : null}
            </CardContent>
          </Card>

          <Card className="mt-6 border-(--border) bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Initial Roles</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-(--muted-foreground)">
                Placeholder: role selector will be replaced with tenant-role
                multi-select once role list endpoints are wired.
              </p>

              <Input
                placeholder="Comma-separated role IDs for now"
                onChange={(event) =>
                  form.setValue("roleIds", parseRoleIds(event.target.value))
                }
              />
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Member"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function FormField({ label, error, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-(--foreground)">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

interface EnrollmentCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function EnrollmentCard({
  icon,
  title,
  description,
  active,
  onClick,
}: EnrollmentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border p-5 text-left transition",
        active
          ? "border-(--primary) bg-emerald-50 ring-4 ring-emerald-100"
          : "border-(--border) bg-white hover:border-(--primary)/50",
      ].join(" ")}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-(--secondary) text-(--primary)">
        {icon}
      </div>
      <h3 className="font-semibold text-(--foreground)">{title}</h3>
      <p className="mt-1 text-sm text-(--muted-foreground)">
        {description}
      </p>
    </button>
  );
}


interface InvitationCreatedCardProps {
  invitation: CreateInvitationResponse;
  onViewMember: () => void;
  onBackToMembers: () => void;
}

function InvitationCreatedCard({
  invitation,
  onViewMember,
  onBackToMembers,
}: InvitationCreatedCardProps) {
  async function handleCopyLink() {
    if (!invitation.activationUrl) return;

    await navigator.clipboard.writeText(invitation.activationUrl);
    toast.success("Invitation link copied");
  }

  return (
    <Card className="mb-6 max-w-4xl border-[var(--border)] bg-white">
      <CardHeader>
        <CardTitle className="text-lg">Invitation Created</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Invitation created successfully.
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            The invited member must open the activation link and create their
            own password before they can sign in.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DetailBlock label="Email" value={invitation.email} />
          <DetailBlock label="Status" value={invitation.status} />
          <DetailBlock
            label="Expires"
            value={new Date(invitation.expiresAt).toLocaleString()}
          />
          <DetailBlock label="Invitation ID" value={invitation.invitationId} />
        </div>

        {invitation.activationUrl ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Activation URL
            </p>

            <p className="mt-2 break-all text-sm font-medium text-[var(--foreground)]">
              {invitation.activationUrl}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={handleCopyLink}>
                <Copy className="mr-2 size-4" />
                Copy Link
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(invitation.activationUrl, "_blank")}
              >
                <ExternalLink className="mr-2 size-4" />
                Open Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              No activation URL returned.
            </p>
            <p className="mt-1 text-sm text-amber-700">
              The backend may have sent the invitation directly. If not, update
              the API to return the activation URL.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-5">
          <Button type="button" variant="outline" onClick={onBackToMembers}>
            <Users className="mr-2 size-4" />
            Back to Members
          </Button>

          <Button type="button" onClick={onViewMember}>
            View Member
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface DetailBlockProps {
  label: string;
  value: React.ReactNode;
}

function DetailBlock({ label, value }: DetailBlockProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-medium text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}