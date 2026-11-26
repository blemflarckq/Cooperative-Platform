import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { TenantRoleOption } from "@/features/tenant-users/types/tenant-user.types";

interface RolePickerProps {
  roles: TenantRoleOption[];
  selectedIds: ReadonlySet<string>;
  onToggle: (roleId: string) => void;
  disabled?: boolean;
}

/**
 * Pick any number of roles, each with what it lets someone do — not just
 * a name, because "Secretary" means nothing to a new treasurer.
 *
 * A role the person choosing isn't allowed to hand out is shown, not
 * hidden, with the reason right on it: say the constraint, don't make
 * someone discover it by tapping. Selection is shown in the neutral
 * foreground colour, not the brand accent — the screen's one accent
 * belongs to its save action.
 */
export function RolePicker({ roles, selectedIds, onToggle, disabled }: RolePickerProps) {
  return (
    <div role="group" aria-label="Roles" className="grid gap-2.5">
      {roles.map((role) => {
        const selected = selectedIds.has(role.id);
        const locked = !role.canAssign;
        const inert = locked || disabled;

        return (
          <button
            key={role.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            disabled={inert}
            onClick={() => onToggle(role.id)}
            className={cn(
              "flex w-full items-start gap-3 rounded-2xl border bg-[var(--card)] p-4 text-left transition-colors",
              locked
                ? "cursor-not-allowed border-dashed border-[var(--border)] text-[var(--muted-foreground)]"
                : "border-[var(--border)] hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/20",
              selected && !locked && "border-[var(--foreground)]/40",
              disabled && !locked && "opacity-60",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                selected
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border)] bg-[var(--background)]",
                locked && "opacity-50",
              )}
            >
              {selected ? <Check className="size-3.5" /> : null}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{role.name}</span>
              {role.description ? (
                <span className="mt-0.5 block text-xs leading-5 text-[var(--muted-foreground)]">
                  {role.description}
                </span>
              ) : null}
              {locked && role.lockedReason ? (
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                  <Lock className="size-3 shrink-0" />
                  {role.lockedReason}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
