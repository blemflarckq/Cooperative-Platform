import { getStoredUser } from "@/lib/auth/auth-storage";

/**
 * Checks whether the current stored user has at least one required permission.
 * If no permissions are required, access is allowed.
 */
export function hasPermission(required?: string[]) {
  if (!required || required.length === 0) return true;

  const user = getStoredUser();
  if (!user) return false;

  return required.some((permission) => user.permissions.includes(permission));
}