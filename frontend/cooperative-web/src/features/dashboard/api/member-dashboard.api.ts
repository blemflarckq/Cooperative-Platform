import { apiClient } from "@/lib/api/api-client";
import type { MemberDashboardData } from "../types/member-dashboard.types";

export async function getMemberDashboard(): Promise<MemberDashboardData> {
  const response = await apiClient.get<MemberDashboardData>("/dashboard/member");
  return response.data;
}
