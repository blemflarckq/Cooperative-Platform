import { Navigate, Outlet, useLocation } from "react-router";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useAuth } from "@/lib/auth/AuthContext";

export function AuthGuard() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
