import { Bell, Search, LogOut, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router";
import { useAuth } from "@/lib/auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ExperienceModeSwitcher } from "@/components/navigation/ExperienceModeSwitcher";
import { ThemeToggle } from "@/components/common/ThemeToggle";

/**
 * Top application header.
 * The search field is currently visual only.
 * Later we can turn it into a global search or quick command surface.
 */
interface AppHeaderProps {
  onOpenMobileNav: () => void;
}

export function AppHeader({ onOpenMobileNav }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function handleLogout() {
    const slug = localStorage.getItem('last_tenant_slug');
    logout();
    queryClient.clear();
    navigate(`/${slug}/login`, { replace: true });
  }

  return (
    
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/80 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenMobileNav}
            className="lg:hidden"
          >
          <Menu className="size-5" />
        </Button>
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              placeholder="Search members, loans, cycles..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] transition hover:bg-[var(--secondary)]">
            <Bell className="size-4" />
          </button>

          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">
              KL
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {user?.fullName ?? "User"}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {user?.tenantName ?? "Cooperative"}
              </p>
            </div>
            <ExperienceModeSwitcher />
            <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              className="flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] transition hover:bg-[var(--secondary)]"
            >
              <LogOut className="size-4" />
            </button>
        </div>
      </div>
    </header>
  );
}