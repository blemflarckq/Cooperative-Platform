import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthContext";
import { mapAuthenticatedUser } from "@/features/auth/api/auth.mapper";
import { useSelectTenant } from "@/features/auth/hooks/useSelectTenant";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { joinWithPreAuthToken } from "@/features/membership/api/membership.api";
import { clearPendingInvite, readPendingInvite } from "@/features/membership/lib/pending-invite";
import type { AuthResult, TenantOption } from "@/features/auth/types/auth.types";

type NoSessionResult = Extract<AuthResult, { status: "select_tenant" | "no_tenant" }>;

/**
 * Shared by every place a session can actually complete — Login,
 * Register, the OAuth callback, and CreateTenantPage. One definition of
 * "what happens once we have a real session," including the phone
 * number gate — applying it in only some of these places would have
 * left OAuth users covered but native-registered-then-create-tenant
 * users slipping through, which isn't the intent.
 *
 * It's also where a person who arrived via an invite link is recognised
 * (the link is remembered in sessionStorage across the sign-in detour).
 * Someone who proved who they are but belongs to no cooperative yet only
 * ever holds a pre-auth token, so their request is submitted with that;
 * someone who already has a full session is sent back to the join page
 * to send it themselves.
 */
export function useAuthResultHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const selectTenantMutation = useSelectTenant();

  const [tenantChoice, setTenantChoice] = useState<{
    preAuthToken: string;
    tenants: TenantOption[];
  } | null>(null);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/app/dashboard";

  /**
   * `nextOverride` lets a caller like CreateTenantPage say "go here
   * next" (e.g. the scheme-setup step) instead of the default
   * dashboard/`from` redirect — the mobile and mustChangePassword gates
   * apply identically either way, they just determine what "next"
   * actually means before handing off to it.
   */
  function completeSession(
    response: {
      accessToken: string;
      refreshToken: string;
      user: Parameters<typeof mapAuthenticatedUser>[0];
    },
    options?: { nextOverride?: string; successMessage?: string },
  ) {
    const mappedUser = mapAuthenticatedUser(response.user);
    login({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: mappedUser,
    });

    const pendingInvite = readPendingInvite();

    const next =
      options?.nextOverride ??
      (mappedUser.mustChangePassword
        ? "/app/change-password"
        : pendingInvite
          ? `/join/${pendingInvite}`
          : redirectTo);

    if (!mappedUser.mobile) {
      navigate("/add-phone", { replace: true, state: { next } });
      return;
    }

    if (options?.successMessage !== "") {
      toast.success(options?.successMessage ?? "Signed in successfully");
    }
    navigate(next, { replace: true });
  }

  function proceedWithoutInvite(result: NoSessionResult) {
    if (result.status === "select_tenant") {
      setTenantChoice({ preAuthToken: result.preAuthToken, tenants: result.tenants });
      return;
    }

    navigate("/create-tenant", {
      replace: true,
      state: { preAuthToken: result.preAuthToken },
    });
  }

  function handleAuthResult(result: AuthResult, options?: { nextOverride?: string }) {
    if (result.status === "authenticated") {
      completeSession(result, options);
      return;
    }

    // They asked to join a cooperative and it hasn't been decided yet.
    // Not a stranger with nowhere to go, so no "name your cooperative"
    // detour — just a plain statement of where things stand.
    if (result.status === "pending_enrollment") {
      navigate("/pending-approval", {
        replace: true,
        state: { tenantName: result.tenantName },
      });
      return;
    }

    const pendingInvite = readPendingInvite();

    if (!pendingInvite) {
      proceedWithoutInvite(result);
      return;
    }

    // Plain promise, not a mutation: this runs from inside another
    // mutation's success callback, and the whole point is that its
    // outcome must not depend on any component staying mounted.
    joinWithPreAuthToken(pendingInvite, result.preAuthToken)
      .then((joined) => {
        clearPendingInvite();
        navigate(`/join/${pendingInvite}`, {
          replace: true,
          state: { submittedTenantName: joined.tenantName },
        });
      })
      .catch((error) => {
        // The invite didn't work (expired, already used...). Say so, then
        // carry on exactly as if they'd signed in normally — they still
        // proved who they are.
        clearPendingInvite();
        toast.error(getApiErrorMessage(error));
        proceedWithoutInvite(result);
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

  return {
    tenantChoice,
    handleAuthResult,
    completeSession,
    handleSelectTenant,
    isSelectingTenant: selectTenantMutation.isPending,
  };
}
