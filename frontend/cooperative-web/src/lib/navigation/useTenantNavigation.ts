import { useNavigate } from "react-router";
import { buildAppPath, buildLoginPath } from "./tenant-routes";

export function useTenantNavigation() {
  const navigate = useNavigate();

  function appPath(path: string) {
    return buildAppPath(path);
  }

  function loginPath() {
    return buildLoginPath();
  }

  function navigateToApp(path: string, options?: { replace?: boolean }) {
    navigate(appPath(path), options);
  }

  function navigateToLogin(options?: { replace?: boolean }) {
    navigate(loginPath(), options);
  }

  return {
    appPath,
    loginPath,
    navigateToApp,
    navigateToLogin,
  };
}
