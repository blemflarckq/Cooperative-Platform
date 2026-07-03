import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function CyclesPage() {
  return (
    <div>
      <PageHeader
        title="Cycles"
        description="Manage the cooperative cycle roster, cycle records, and year-cycle participation."
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Cycles module scaffolded. Table, filters, and detail view come next.
        </CardContent>
      </Card>
    </div>
  );
}