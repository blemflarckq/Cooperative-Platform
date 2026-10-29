import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/api-error";
import { useAuth } from "@/lib/auth/AuthContext";
import { getRefreshToken } from "@/lib/auth/auth-storage";
import { switchTenantRequest } from "../api/auth.api";
import { mapAuthenticatedUser } from "../api/auth.mapper";

/**
 * Moves the signed-in person into another cooperative they belong to,
 * without signing out. All of the follow-through lives here in the hook
 * (not in whichever component clicked) so it still completes even if
 * that component has unmounted by the time the response arrives.
 */
export function useSwitchTenant() {
  const { login } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (tenantId: string) => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error("Your session has ended. Please sign in again.");
      }
      return switchTenantRequest({ refreshToken, tenantId });
    },
    onSuccess: (response) => {
      login({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: mapAuthenticatedUser(response.user),
      });

      // Everything cached so far belongs to the cooperative we just left.
      // None of it may be shown — even for a moment — inside the new one.
      queryClient.clear();
      navigate("/app/dashboard", { replace: true });
      toast.success(`Switched to ${response.user.tenantName}`);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
