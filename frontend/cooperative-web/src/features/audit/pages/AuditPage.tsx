import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function AuditPage() {
  return (
    <div>
      <PageHeader
        title="Audit"
        description="Manage the cooperative audit roster, audit records, and year-cycle participation."
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Audit module scaffolded. Table, filters, and detail view come next.
        </CardContent>
      </Card>
    </div>
  );
}