import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { LoadingState } from "@/components/feedback/LoadingState";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { oauthCompleteRequest } from "@/features/auth/api/auth.api";
import { useAuthResultHandler } from "@/features/auth/hooks/useAuthResultHandler";
import { TenantPicker } from "@/features/auth/components/TenantPicker";

/**
 * Where Google/Facebook redirect back to after the backend's callback
 * runs. The URL carries only a short-lived, single-purpose code — never
 * real session tokens — exchanged here for the actual AuthResult.
 *
 * Deliberately calls oauthCompleteRequest directly rather than going
 * through useMutation — the previous version's callback depended on a
 * mutation observer surviving React 18 StrictMode's deliberate
 * mount/unmount/remount cycle in development, and that dependency
 * couldn't be verified with full confidence across React Query
 * versions. A plain async function called from a plain effect has no
 * such ambiguity: nothing about its behavior depends on whether the
 * component that started it is still mounted by the time it resolves.
 *
 * The console.log calls below are temporary diagnostics — if this
 * still doesn't redirect, whichever log is the LAST one to appear
 * before it gets stuck tells us exactly where the chain actually
 * breaks, instead of guessing again.
 */
export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { tenantChoice, handleAuthResult, handleSelectTenant, isSelectingTenant } =
    useAuthResultHandler();

  useEffect(() => {
    const code = searchParams.get("code");
    console.log("[oauth-callback] effect running, code present:", Boolean(code));

    if (!code) {
      toast.error("Sign-in link was incomplete — please try again.");
      navigate("/login", { replace: true });
      return;
    }

    const processedKey = `oauth_code_processed:${code}`;
    if (sessionStorage.getItem(processedKey)) {
      console.log("[oauth-callback] this code was already processed, skipping");
      return;
    }
    sessionStorage.setItem(processedKey, "1");

    oauthCompleteRequest(code)
      .then((result) => {
        console.log("[oauth-callback] oauth-complete succeeded, result:", result);
        handleAuthResult(result);
        console.log("[oauth-callback] handleAuthResult call finished");
      })
      .catch((error) => {
        console.log("[oauth-callback] oauth-complete failed:", error);
        toast.error(getApiErrorMessage(error));
        navigate("/login", { replace: true });
      });
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
