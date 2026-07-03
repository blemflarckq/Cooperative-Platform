import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type SchemeFormValues } from "../schemas/scheme.schema";
import { getFundRuleSummary } from "../utils/get-fund-rule-summary";

interface FundRulesPreviewCardProps {
  values: Partial<SchemeFormValues>;
}

export function FundRulesPreviewCard({ values }: FundRulesPreviewCardProps) {
  const summary = getFundRuleSummary(values);

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader>
        <CardTitle>What this means</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          A simple explanation of how this fund will operate.
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {summary.map((line) => (
            <div key={line.id} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <p className="text-sm font-medium text-[var(--foreground)]">
                {line.text}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}