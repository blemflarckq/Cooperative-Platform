import { apiClient } from "@/lib/api/api-client";
import type { AdminDashboardData } from "../types/admin-dashboard.types";

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const response = await apiClient.get<AdminDashboardData>("/dashboard/admin");
  return response.data;
}
