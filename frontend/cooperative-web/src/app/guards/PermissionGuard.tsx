import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/lib/auth/AuthContext";

interface PermissionGuardProps {
  permissions?: string[];
}

export function PermissionGuard({ permissions }: PermissionGuardProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permissions)) {
    return <Navigate to="/app/unauthorized" replace />;
  }

  return <Outlet />;
}