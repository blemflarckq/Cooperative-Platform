import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function LoansPage() {
  return (
    <div>
      <PageHeader
        title="Loans"
        description="Manage the cooperative loan roster, loan records, and year-cycle participation."
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Loans module scaffolded. Table, filters, and detail view come next.
        </CardContent>
      </Card>
    </div>
  );
}