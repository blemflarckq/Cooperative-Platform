import { useNavigate, useParams } from "react-router";
import { buildTenantAppPath, buildTenantLoginPath } from "./tenant-routes";

export function useTenantNavigation() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  function requireTenantSlug() {
    if (!tenantSlug) {
      throw new Error("Missing tenantSlug in route params");
    }

    return tenantSlug;
  }

  function appPath(path: string) {
    return buildTenantAppPath(requireTenantSlug(), path);
  }

  function loginPath() {
    return buildTenantLoginPath(requireTenantSlug());
  }

  function navigateToApp(path: string, options?: { replace?: boolean }) {
    navigate(appPath(path), options);
  }

  function navigateToLogin(options?: { replace?: boolean }) {
    navigate(loginPath(), options);
  }

  return {
    tenantSlug: requireTenantSlug(),
    appPath,
    loginPath,
    navigateToApp,
    navigateToLogin,
  };
}