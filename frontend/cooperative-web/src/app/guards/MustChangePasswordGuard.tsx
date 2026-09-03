import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/lib/auth/AuthContext";

export function MustChangePasswordGuard() {
  const { user } = useAuth();

  if (user?.mustChangePassword) {
    return <Navigate to="/app/change-password" replace />;
  }

  return <Outlet />;
}
