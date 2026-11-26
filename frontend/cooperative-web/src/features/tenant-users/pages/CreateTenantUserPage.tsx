import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, ExternalLink, KeyRound, Link2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { formatDateTime } from "@/lib/formatting/date";
import { cn } from "@/lib/utils/cn";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { RolePicker } from "@/features/tenant-users/components/RolePicker";
import {
  createTenantUserInvitation,
  createTenantUserWithTempPassword,
} from "@/features/tenant-users/api/tenant-user-enrollment.api";
import { tenantUserQueryKeys } from "@/features/tenant-users/hooks/tenant-user-query-keys";
import { useTenantRoles } from "@/features/tenant-users/hooks/useTenantRoles";
import {
  tenantUserEnrollmentSchema,
  type TenantUserEnrollmentFormValues,
} from "@/features/tenant-users/schemas/tenant-user-enrollment.schema";
import type { CreateInvitationResponse } from "@/features/tenant-users/types/tenant-user-enrollment.types";

const cardClass =
  "gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0";

/**
 * Appointing someone directly to a role. This is the older, direct way in
 * — people who join on their own go through an invite link and two
 * approvals instead (the Invite button on Members). Both ways are kept:
 * appointing is for staff the cooperative already knows it wants.
 *
 * Only an administrator can appoint an administrator; the roles list
 * shows that role locked, with the reason, to anyone else.
 */
export function CreateTenantUserPage() {
  const queryClient = useQueryClient();
  const { navigateToApp, appPath } = useTenantNavigation();
  const rolesQuery = useTenantRoles();
  const [createdInvitation, setCreatedInvitation] = useState<CreateInvitationResponse | null>(null);

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
  const { errors } = form.formState;

  const method = form.watch("enrollmentMethod");
  const roleIds = form.watch("roleIds");
  const selectedRoles = new Set(roleIds);

  const invitationMutation = useMutation({
    mutationFn: createTenantUserInvitation,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: tenantUserQueryKeys.lists() });
      setCreatedInvitation(response);
      toast.success("Invitation created");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const tempPasswordMutation = useMutation({
    mutationFn: createTenantUserWithTempPassword,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: tenantUserQueryKeys.lists() });
      toast.success("Member created");
      navigateToApp(`/members/${response.tenantUserId}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const isSubmitting = invitationMutation.isPending || tempPasswordMutation.isPending;

  function toggleRole(roleId: string) {
    const next = new Set(selectedRoles);
    if (next.has(roleId)) next.delete(roleId);
    else next.add(roleId);
    form.setValue("roleIds", [...next], { shouldValidate: form.formState.isSubmitted });
  }

  function handleSubmit(values: TenantUserEnrollmentFormValues) {
    const common = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      mobile: values.mobile,
      roleIds: values.roleIds,
    };

    if (values.enrollmentMethod === "invitation") {
      invitationMutation.mutate(common);
      return;
    }

    tempPasswordMutation.mutate({ ...common, temporaryPassword: values.temporaryPassword! });
  }

  if (createdInvitation) {
    return (
      <PageContainer>
        <PageHeader title="Invitation ready" />
        <InvitationCreated
          invitation={createdInvitation}
          firstName={form.getValues("firstName")}
          onViewMember={() => navigateToApp(`/members/${createdInvitation.tenantUserId}`)}
          onBackToMembers={() => navigateToApp("/members")}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Appoint staff"
        description="Add someone directly and give them a role. To let people join on their own, use Invite on the Members page."
        backTo={appPath("/members")}
        backLabel="Members"
      />

      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="grid gap-4">
        <Card className={cardClass}>
          <h2 className="text-sm font-medium">Who they are</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name" error={errors.firstName?.message} htmlFor="firstName">
              <Input id="firstName" autoComplete="off" {...form.register("firstName")} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message} htmlFor="lastName">
              <Input id="lastName" autoComplete="off" {...form.register("lastName")} />
            </Field>
            <Field label="Email" error={errors.email?.message} htmlFor="email" className="md:col-span-2">
              <Input id="email" type="email" autoComplete="off" {...form.register("email")} />
            </Field>
            <Field
              label="Mobile number"
              error={errors.mobile?.message}
              htmlFor="mobile"
              className="md:col-span-2"
              hint="With the country code. A local Lesotho number works without +266."
            >
              <Input id="mobile" placeholder="+26658000000" {...form.register("mobile")} />
            </Field>
          </div>
        </Card>

        <Card className={cardClass}>
          <h2 className="text-sm font-medium">How they get in</h2>
          <div className="grid gap-2.5 md:grid-cols-2">
            <MethodCard
              icon={<Link2 className="size-5" />}
              title="Send a link"
              description="They open the link and choose their own password."
              active={method === "invitation"}
              onClick={() => form.setValue("enrollmentMethod", "invitation")}
            />
            <MethodCard
              icon={<KeyRound className="size-5" />}
              title="Set a temporary password"
              description="You choose a password for them. They must change it the first time they sign in."
              active={method === "temporary-password"}
              onClick={() => form.setValue("enrollmentMethod", "temporary-password")}
            />
          </div>

          {method === "temporary-password" ? (
            <Field
              label="Temporary password"
              error={errors.temporaryPassword?.message}
              htmlFor="temporaryPassword"
              hint="At least 8 characters. Tell them in person, not in a message they might keep."
            >
              <Input
                id="temporaryPassword"
                type="password"
                autoComplete="new-password"
                {...form.register("temporaryPassword")}
              />
            </Field>
          ) : null}
        </Card>

        <Card className={cardClass}>
          <div>
            <h2 className="text-sm font-medium">Roles</h2>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              What they will be allowed to do. Pick at least one.
            </p>
          </div>

          {rolesQuery.isLoading ? (
            <LoadingState />
          ) : rolesQuery.isError || !rolesQuery.data ? (
            <ErrorState title="Could not load the roles" description="Reload the page to try again." />
          ) : (
            <RolePicker
              roles={rolesQuery.data}
              selectedIds={selectedRoles}
              onToggle={toggleRole}
              disabled={isSubmitting}
            />
          )}
          {errors.roleIds ? (
            <p className="text-xs text-[var(--destructive)]">{errors.roleIds.message}</p>
          ) : null}
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigateToApp("/members")} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Appointing…" : "Appoint"}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

function Field({ label, htmlFor, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[var(--destructive)]">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

interface MethodCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

/** Selection is shown in the neutral foreground colour — the screen's one accent is "Appoint". */
function MethodCard({ icon, title, description, active, onClick }: MethodCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-[var(--card)] p-4 text-left transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/20",
        active ? "border-[var(--foreground)]/40 bg-[var(--secondary)]" : "border-[var(--border)]",
      )}
    >
      <div className="mb-2 text-[var(--muted-foreground)]">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">{description}</p>
    </button>
  );
}

interface InvitationCreatedProps {
  invitation: CreateInvitationResponse;
  firstName: string;
  onViewMember: () => void;
  onBackToMembers: () => void;
}

/** Confirmation that says what happens next, not just that something happened. */
function InvitationCreated({
  invitation,
  firstName,
  onViewMember,
  onBackToMembers,
}: InvitationCreatedProps) {
  async function copyLink() {
    if (!invitation.activationUrl) return;
    try {
      await navigator.clipboard.writeText(invitation.activationUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy it by hand");
    }
  }

  return (
    <Card className={cardClass}>
      <div>
        <h2 className="text-sm font-medium">{firstName ? `${firstName} is invited` : "Invitation created"}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
          They open the link, choose their own password, and then they can sign in. The link works
          until {formatDateTime(invitation.expiresAt)}.
        </p>
      </div>

      {invitation.activationUrl ? (
        <>
          <p className="break-all rounded-xl border border-[var(--border)] bg-[var(--secondary)] p-3 text-xs leading-5">
            {invitation.activationUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copyLink}>
              <Copy className="mr-1.5 size-4" />
              Copy link
            </Button>
            <Button variant="outline" onClick={() => window.open(invitation.activationUrl, "_blank")}>
              <ExternalLink className="mr-1.5 size-4" />
              Open link
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          No link came back with this invitation, so there is nothing to share from here.
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
        <Button variant="outline" onClick={onViewMember}>
          View member
        </Button>
        <Button variant="ghost" onClick={onBackToMembers}>
          Back to members
        </Button>
      </div>
    </Card>
  );
}
