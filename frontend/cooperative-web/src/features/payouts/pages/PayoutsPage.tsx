import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function PayoutsPage() {
  return (
    <div>
      <PageHeader
        title="Payouts"
        description="Manage the cooperative payout roster, payout records, and year-cycle participation."
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Payouts module scaffolded. Table, filters, and detail view come next.
        </CardContent>
      </Card>
    </div>
  );
}