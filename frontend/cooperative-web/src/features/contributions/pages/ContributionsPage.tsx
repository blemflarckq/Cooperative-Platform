import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function ContributionsPage() {
  return (
    <div>
      <PageHeader
        title="Contributionss"
        description="Manage the cooperative contributions roster, contributions records, and year-cycle participation."
      />

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          Contributionss module scaffolded. Table, filters, and detail view come next.
        </CardContent>
      </Card>
    </div>
  );
}