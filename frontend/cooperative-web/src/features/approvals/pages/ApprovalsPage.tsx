import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function ApprovalsPage() {
  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Manage the cooperative approval roster, approval records, and year-cycle participation."
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Approvals module scaffolded. Table, filters, and detail view come next.
        </CardContent>
      </Card>
    </div>
  );
}