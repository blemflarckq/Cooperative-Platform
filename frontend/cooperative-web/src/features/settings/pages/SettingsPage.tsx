import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage the cooperative setting roster, setting records, and year-cycle participation."
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Settings module scaffolded. Table, filters, and detail view come next.
        </CardContent>
      </Card>
    </div>
  );
}