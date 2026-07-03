import { Navigate, Outlet, useParams } from "react-router";
import { useAuth } from "@/lib/auth/AuthContext";

export function MustChangePasswordGuard() {
  const { user } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  if (user?.mustChangePassword) {
    return <Navigate to={`/${tenantSlug}/change-password`} replace />;
  }

  return <Outlet />;
}