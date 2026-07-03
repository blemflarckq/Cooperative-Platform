import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type AuthUser,
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  setAccessToken,
  setRefreshToken,
  setStoredUser,
} from "@/lib/auth/auth-storage";
import { getMe } from "@/features/auth/api/auth.api";
import { mapAuthenticatedUser } from "@/features/auth/api/auth.mapper";

interface LoginPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => void;
  logout: () => void;
  hasPermission: (permissions?: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
/**
 * AuthProvider owns the frontend auth session state.
 *
 * It currently connects to the backend auth endpoints, this provider will also:
 * - validate the session
 * - refresh tokens
 * - load the authenticated user profile
 * - load tenant context
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    async function bootstrapSession() {
      const existingToken = getAccessToken();

      if (!existingToken) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const me = await getMe();
        const mappedUser = mapAuthenticatedUser(me);

        setStoredUser(mappedUser);
        setUser(mappedUser);
        setToken(existingToken);
      } catch {
        clearAuthStorage();
        setUser(null);
        setToken(null);
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrapSession();
  }, []);

  function login(payload: LoginPayload) {
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setStoredUser(payload.user);
    setToken(payload.accessToken);
    setUser(payload.user);
  }

  function logout() {
    clearAuthStorage();
    setToken(null);
    setUser(null);
  }

  function hasPermission(permissions?: string[]) {
    if (!permissions || permissions.length === 0) return true;
    if (!user) return false;
    //console.log("these are the current user's permissions", user.permissions);
    return permissions.some((permission) => user.permissions.includes(permission));
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      login,
      logout,
      hasPermission,
    }),
    [token, user, isBootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}