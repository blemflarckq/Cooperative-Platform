import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

interface FeaturePlaceholderPageProps {
  title: string;
  description: string;
  note?: string;
}

export function FeaturePlaceholderPage({
  title,
  description,
  note = "This module is scaffolded and ready for implementation.",
}: FeaturePlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">
          {note}
        </CardContent>
      </Card>
    </div>
  );
}