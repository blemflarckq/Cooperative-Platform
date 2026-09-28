import { useQuery } from "@tanstack/react-query";
import { getMemberDashboard } from "../api/member-dashboard.api";

export function useMemberDashboard() {
  return useQuery({
    queryKey: ["dashboard", "member"],
    queryFn: getMemberDashboard,
  });
}
