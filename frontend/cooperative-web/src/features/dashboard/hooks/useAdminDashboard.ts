import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "../api/admin-dashboard.api";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: getAdminDashboard,
  });
}
