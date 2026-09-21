import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  getStoredTenantId,
  setAccessToken,
  setRefreshToken,
  setStoredUser,
} from "@/lib/auth/auth-storage";
import { mapAuthenticatedUser } from "@/features/auth/api/auth.mapper";
import type { AuthenticatedUserResponse } from "@/features/auth/types/auth.types";

/**
 * Central Axios instance for the whole app.
 *
 * Rules:
 * - Feature modules must not create their own Axios instances.
 * - Auth token attachment happens here.
 * - Later we will add refresh-token and tenant headers here.
 */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
  // Same shape the login endpoint returns — previously this was a
  // different, incorrect shape (a single `fullName` field that the real
  // backend never actually sends), which meant every silent token refresh
  // stored a user object missing roles/mustChangePassword. Reusing
  // AuthenticatedUserResponse + mapAuthenticatedUser keeps this in sync
  // with the login flow instead of drifting independently.
  user: AuthenticatedUserResponse;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
  const token = getAccessToken();
  const tenantId = getStoredTenantId();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId) {
    config.headers["X-Tenant-Id"] = tenantId;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;
    // Previously only /auth/refresh itself was excluded — but every one
    // of these is a PRE-session request: there's no real access token
    // involved yet, so a 401 from any of them means "these credentials/
    // this code were wrong," not "my session token went stale." Treating
    // it as the latter and attempting a refresh-and-retry is conceptually
    // wrong regardless of whether it happens to behave safely — this
    // request was never tied to a stored session to refresh in the
    // first place.
    const PRE_SESSION_AUTH_PATHS = [
      "/auth/login",
      "/auth/register",
      "/auth/select-tenant",
      "/auth/create-tenant",
      "/auth/oauth-complete",
      "/auth/refresh",
    ];
    const isPreSessionRequest = PRE_SESSION_AUTH_PATHS.some((path) =>
      originalRequest.url?.includes(path),
    );
    if (!isUnauthorized || originalRequest._retry || isPreSessionRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthStorage();
      return Promise.reject(error);
    }
    
    try {
      const refreshResponse = await axios.post<RefreshResponse>(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        { refreshToken },
        {
          headers: {
            "Content-Type": "application/json",
            ...(getStoredTenantId()
              ? { "X-Tenant-Id": getStoredTenantId() as string }
              : {}),
          },
        },
      );
      const newAccessToken = refreshResponse.data.accessToken;
      const newRefreshToken = refreshResponse.data.refreshToken;
      const mappedUser = mapAuthenticatedUser(refreshResponse.data.user);

      setAccessToken(newAccessToken);
      setStoredUser(mappedUser);

      if (newRefreshToken) {
        setRefreshToken(newRefreshToken);
      }

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      console.error("Refresh Call Failed!", refreshError);
      clearAuthStorage();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    }
  },
);