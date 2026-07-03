import { Badge } from "@/components/ui/badge";
import type { TenantRoleSummary } from "@/features/tenant-users/types/tenant-user.types";

interface RoleChipsProps {
  roles: TenantRoleSummary[];
}

export function RoleChips({ roles }: RoleChipsProps) {
  if (roles.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        No roles assigned
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <Badge key={role.id} variant="secondary" className="rounded-lg">
          {role.name}
        </Badge>
      ))}
    </div>
  );
}