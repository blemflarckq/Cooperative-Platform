const ACCESS_TOKEN_KEY = "coop.access_token";
const REFRESH_TOKEN_KEY = "coop.refresh_token";
const USER_KEY = "coop.user";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  tenantId?: string;
  tenantName?: string;
  roles: string[];
  permissions: string[];
  mustChangePassword: boolean;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredTenantId(): string | null {
  const user = getStoredUser();
  return user?.tenantId ?? null;
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}