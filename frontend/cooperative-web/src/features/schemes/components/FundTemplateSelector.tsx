import { CheckCircle2 } from "lucide-react";
import { FUND_TEMPLATES } from "../constants/fund-templates";
import { type FundTemplateId } from "../types/fund-template.types";
import { cn } from "@/lib/utils/cn";

interface FundTemplateSelectorProps {
  value?: FundTemplateId;
  onChange: (value: FundTemplateId) => void;
}

export function FundTemplateSelector({
  value,
  onChange,
}: FundTemplateSelectorProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {FUND_TEMPLATES.map((template) => {
        const selected = value === template.id;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onChange(template.id)}
            className={cn(
              "relative rounded-2xl border p-5 text-left transition",
              selected
                ? "border-[var(--primary)] bg-[var(--secondary)] shadow-sm"
                : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)]",
            )}
          >
            {selected ? (
              <CheckCircle2 className="absolute right-4 top-4 size-5 text-[var(--primary)]" />
            ) : null}

            <p className="pr-8 text-base font-semibold text-[var(--foreground)]">
              {template.title}
            </p>

            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {template.description}
            </p>

            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Recommended for
            </p>

            <p className="mt-1 text-sm text-[var(--foreground)]">
              {template.recommendedFor}
            </p>
          </button>
        );
      })}
    </div>
  );
}