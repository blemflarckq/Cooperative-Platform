import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { LoadingState } from "@/components/feedback/LoadingState";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useOAuthComplete } from "@/features/auth/hooks/useOAuthComplete";
import { useAuthResultHandler } from "@/features/auth/hooks/useAuthResultHandler";
import { TenantPicker } from "@/features/auth/components/TenantPicker";

/**
 * Where Google/Facebook redirect back to after the backend's callback
 * runs. The URL carries only a short-lived, single-purpose code — never
 * real session tokens — which gets exchanged here for the actual
 * AuthResult via a normal POST, then handled identically to a plain
 * email login via the same shared hook.
 */
export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oauthComplete = useOAuthComplete();
  const { tenantChoice, handleAuthResult, handleSelectTenant, isSelectingTenant } =
    useAuthResultHandler();

  // Guards against React 18 StrictMode's double-invoke in development,
  // and against the one-time code accidentally being submitted twice —
  // it would fail the second time anyway (60-second, single-use), but
  // there's no reason to even try.
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const code = searchParams.get("code");

    if (!code) {
      toast.error("Sign-in link was incomplete — please try again.");
      navigate("/login", { replace: true });
      return;
    }

    oauthComplete.mutate(code, {
      onSuccess: (result) => handleAuthResult(result),
      onError: (error) => {
        toast.error(getApiErrorMessage(error));
        navigate("/login", { replace: true });
      },
    });
    // Deliberately run once — handleAuthResult and navigate are stable
    // enough for this one-shot exchange not to need to react to their
    // identity changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (tenantChoice) {
    return (
      <TenantPicker
        tenants={tenantChoice.tenants}
        isPending={isSelectingTenant}
        onSelect={handleSelectTenant}
      />
    );
  }

  return <LoadingState />;
}
