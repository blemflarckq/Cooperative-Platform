import { NavLink } from "react-router";
import { Landmark } from "lucide-react";
import { APP_NAV_GROUPS } from "@/lib/constants/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { cn } from "@/lib/utils/cn";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";

export function AppSidebar() {
  const { mode } = useExperienceMode();
  const { hasPermission } = useAuth();
  const { appPath } = useTenantNavigation();

  const visibleGroups = APP_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const hasAccess = hasPermission(item.permissions);

      const itemMode = item.mode ?? "both";

      const modeAllowed =
        itemMode === "both" ||
        itemMode === mode ||
        // Community items remain visible in professional mode too.
        (mode === "professional" && itemMode === "community");

      return hasAccess && modeAllowed;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-[var(--border)] bg-white/80 backdrop-blur lg:flex lg:flex-col">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-sm">
            <Landmark className="size-5" />
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              Cooperative Platform
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              Admin Portal
            </h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const to = appPath(item.to);

                  return (
                    <NavLink
                      key={item.to}
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "text-[var(--foreground)] hover:bg-[var(--secondary)]",
                        )
                      }
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}