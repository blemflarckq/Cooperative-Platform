import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthContext";
import { mapAuthenticatedUser } from "@/features/auth/api/auth.mapper";
import { useSelectTenant } from "@/features/auth/hooks/useSelectTenant";
import { getApiErrorMessage } from "@/lib/api/api-error";
import type { AuthResult, TenantOption } from "@/features/auth/types/auth.types";

/**
 * Shared by every place a session can actually complete — Login,
 * Register, the OAuth callback, and CreateTenantPage. One definition of
 * "what happens once we have a real session," including the phone
 * number gate — applying it in only some of these places would have
 * left OAuth users covered but native-registered-then-create-tenant
 * users slipping through, which isn't the intent.
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

    const next =
      options?.nextOverride ??
      (mappedUser.mustChangePassword ? "/app/change-password" : redirectTo);

    if (!mappedUser.mobile) {
      navigate("/add-phone", { replace: true, state: { next } });
      return;
    }

    if (options?.successMessage !== "") {
      toast.success(options?.successMessage ?? "Signed in successfully");
    }
    navigate(next, { replace: true });
  }

  function handleAuthResult(result: AuthResult, options?: { nextOverride?: string }) {
    if (result.status === "authenticated") {
      completeSession(result, options);
      return;
    }

    if (result.status === "select_tenant") {
      setTenantChoice({ preAuthToken: result.preAuthToken, tenants: result.tenants });
      return;
    }

    navigate("/create-tenant", {
      replace: true,
      state: { preAuthToken: result.preAuthToken },
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
