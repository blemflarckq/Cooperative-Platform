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
  user: {
    id: string;
    fullName: string;
    email: string;
    tenantId?: string;
    tenantName?: string;
    permissions: string[];
  }
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
  console.log("We are using this tenantID", tenantId);

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

    console.log("Are we failing here?", originalRequest);

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;
    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh");

    console.log("Are we failing here?", isUnauthorized, isRefreshRequest);
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
      console.log("Starting Refresh Call...");
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
      console.log("Refresh Call Success!");

      const newAccessToken = refreshResponse.data.accessToken;
      const newRefreshToken = refreshResponse.data.refreshToken;
      const responseUser = refreshResponse.data.user;

      setAccessToken(newAccessToken);
      setStoredUser(responseUser);

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