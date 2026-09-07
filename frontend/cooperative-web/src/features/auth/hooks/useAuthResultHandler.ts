import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/AuthContext";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { mapAuthenticatedUser } from "@/features/auth/api/auth.mapper";
import { useSelectTenant } from "@/features/auth/hooks/useSelectTenant";
import type { AuthResult, TenantOption } from "@/features/auth/types/auth.types";

/**
 * Shared by LoginPage and RegisterPage — both produce the same
 * AuthResult shape and need to branch on it identically (straight in,
 * pick a tenant, or route into Setup). One definition, not two copies
 * that could drift.
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

  function handleAuthResult(result: AuthResult) {
    if (result.status === "authenticated") {
      completeSession(result);
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
    handleSelectTenant,
    isSelectingTenant: selectTenantMutation.isPending,
  };
}
