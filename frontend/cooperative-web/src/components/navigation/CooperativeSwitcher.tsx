import { ArrowLeftRight, Check } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMyTenants } from "@/features/auth/hooks/useMyTenants";
import { useSwitchTenant } from "@/features/auth/hooks/useSwitchTenant";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * Lets someone who belongs to more than one cooperative move between
 * them without signing out. Renders nothing at all for everyone else —
 * a control that can never do anything is just clutter.
 */
export function CooperativeSwitcher() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const tenantsQuery = useMyTenants();
  const switchTenant = useSwitchTenant();
  const tenants = tenantsQuery.data ?? [];

  if (tenants.length < 2) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Switch cooperative"
        title="Switch cooperative"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] transition hover:bg-[var(--secondary)]"
      >
        <ArrowLeftRight className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Switch cooperative</DialogTitle>
            <DialogDescription>
              You belong to {tenants.length} cooperatives. Pick the one you want to work in.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {tenants.map((tenant) => {
              const isCurrent = tenant.id === user?.tenantId;

              return (
                <button
                  key={tenant.id}
                  type="button"
                  disabled={isCurrent || switchTenant.isPending}
                  onClick={() => switchTenant.mutate(tenant.id, { onSuccess: () => setOpen(false) })}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition disabled:cursor-default ${
                    isCurrent
                      ? "border-[var(--primary)] bg-[var(--secondary)]"
                      : "border-[var(--border)] hover:bg-[var(--secondary)] disabled:opacity-60"
                  }`}
                >
                  <span className="truncate text-sm font-medium">{tenant.name}</span>
                  {isCurrent && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--muted-foreground)]">
                      <Check className="size-3.5" />
                      Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
