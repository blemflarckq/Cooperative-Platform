import { Badge } from "@/components/ui/badge";
import { getStatusToneClass, type StatusTone } from "@/lib/domain/status-style";
import { cn } from "@/lib/utils/cn";
import type { TenantUserListItem } from "@/features/tenant-users/types/tenant-user.types";

type MemberState = Pick<TenantUserListItem, "membershipIsActive" | "status">;

/**
 * What a member's status means to the people reading it. The shared
 * lifecycle badge calls a switched-off member "Temporarily stopped",
 * which is how a scheme reads, not a person — here the word is the
 * action someone took: deactivated.
 */
function describeMemberState(member: MemberState): { label: string; tone: StatusTone } {
  if (member.status === "invited") return { label: "Invited", tone: "neutral" };
  if (!member.membershipIsActive || member.status === "suspended") {
    return { label: "Deactivated", tone: "warning" };
  }
  return { label: "Active", tone: "success" };
}

export function MemberStatusBadge({ member }: { member: MemberState }) {
  const { label, tone } = describeMemberState(member);
  return (
    <Badge variant="outline" className={cn(getStatusToneClass(tone))}>
      {label}
    </Badge>
  );
}
