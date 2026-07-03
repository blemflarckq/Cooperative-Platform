import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

interface PermissionGateProps {
  permissions?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Declarative permission wrapper.
 *
 * Use this for buttons, page actions, tabs, and sensitive UI controls.
 * Backend authorization still remains the final source of truth.
 */
export function PermissionGate({
  permissions,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permissions)) {
    return fallback;
  }

  return <>{children}</>;
}