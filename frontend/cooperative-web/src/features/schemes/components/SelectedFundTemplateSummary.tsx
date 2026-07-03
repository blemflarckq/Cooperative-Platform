import { FUND_TEMPLATES } from "../constants/fund-templates";
import { type FundTemplateId } from "../types/fund-template.types";
import { Card, CardContent } from "@/components/ui/card";

interface SelectedFundTemplateSummaryProps {
  templateId?: FundTemplateId;
}

export function SelectedFundTemplateSummary({
  templateId,
}: SelectedFundTemplateSummaryProps) {
  const template = FUND_TEMPLATES.find((item) => item.id === templateId);

  if (!template) return null;

  return (
    <Card className="border-[var(--border)] bg-[var(--secondary)]">
      <CardContent className="p-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Selected template: {template.title}
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          {template.description}
        </p>
      </CardContent>
    </Card>
  );
}