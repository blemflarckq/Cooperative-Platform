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
    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh");
    if (!isUnauthorized || originalRequest._retry || isRefreshRequest) {
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