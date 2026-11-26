import { cn } from "@/lib/utils/cn";
import { FUND_TEMPLATES } from "../constants/fund-templates";
import { type FundTemplateId } from "../types/fund-template.types";

interface FundTemplateSelectorProps {
  onSelect: (value: FundTemplateId) => void;
}

/**
 * "What is it for?" — one tap picks the closest match and moves on, so
 * there is no separate Continue to press. The next step shows the choice
 * and a way back if it was the wrong one.
 */
export function FundTemplateSelector({ onSelect }: FundTemplateSelectorProps) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {FUND_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onSelect(template.id)}
          className={cn(
            "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/20",
          )}
        >
          <div className="text-sm font-medium">{template.title}</div>
          <p className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">
            {template.description}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">
            Good for {lowerFirst(template.recommendedFor)}
          </p>
        </button>
      ))}
    </div>
  );
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
