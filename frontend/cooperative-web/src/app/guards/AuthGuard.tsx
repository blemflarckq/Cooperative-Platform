import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useAuth } from "@/lib/auth/AuthContext";
/**
 * Protects all authenticated routes.
 */
export function AuthGuard() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  if (isBootstrapping) {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return 
      <Navigate to={`/${tenantSlug}/login`}
        replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}