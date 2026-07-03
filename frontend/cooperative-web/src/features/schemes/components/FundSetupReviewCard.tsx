import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type FundTemplateId } from "../types/fund-template.types";
import { type SchemeFormValues } from "../schemas/scheme.schema";
import { getTemplateReviewSummary } from "../utils/get-template-review-summary";

interface FundSetupReviewCardProps {
  templateId: FundTemplateId;
  values: SchemeFormValues;
}

export function FundSetupReviewCard({
  templateId,
  values,
}: FundSetupReviewCardProps) {
  const summary = getTemplateReviewSummary(templateId, values);

  return (
    <Card className="border-[var(--border)] bg-[var(--card)]">
      <CardHeader>
        <CardTitle>Review Your Group Fund</CardTitle>
        <p className="text-sm text-[var(--muted-foreground)]">
          Confirm that this setup matches how your group wants to operate.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            You are creating a {summary.title}.
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {summary.description}
          </p>
        </div>

        <div className="space-y-3">
          {summary.lines.map((line) => (
            <div
              key={line.label}
              className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                  {line.label}
                </p>
                <p className="mt-1 font-medium text-[var(--foreground)]">
                  {line.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}