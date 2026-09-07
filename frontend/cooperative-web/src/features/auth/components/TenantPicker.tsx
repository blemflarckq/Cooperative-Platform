import { Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantOption } from "@/features/auth/types/auth.types";

interface TenantPickerProps {
  tenants: TenantOption[];
  isPending: boolean;
  onSelect: (tenantId: string) => void;
}

export function TenantPicker({ tenants, isPending, onSelect }: TenantPickerProps) {
  return (
    <Card className="border-(--border) bg-white shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-(--primary) text-white shadow-sm">
            <Landmark className="size-6" />
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            Which cooperative?
          </CardTitle>
          <p className="mt-2 text-sm text-(--muted-foreground)">
            You belong to more than one — pick one to continue.
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {tenants.map((tenant) => (
          <button
            key={tenant.id}
            type="button"
            disabled={isPending}
            onClick={() => onSelect(tenant.id)}
            className="rounded-xl border border-(--border) px-4 py-3 text-left text-sm font-medium hover:bg-(--secondary) disabled:opacity-50"
          >
            {tenant.name}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
