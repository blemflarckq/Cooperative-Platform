import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function SubscriptionsPage() {
  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Manage the cooperative subscription roster, subscription records, and year-cycle participation."
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Subscriptions module scaffolded. Table, filters, and detail view come next.
        </CardContent>
      </Card>
    </div>
  );
}