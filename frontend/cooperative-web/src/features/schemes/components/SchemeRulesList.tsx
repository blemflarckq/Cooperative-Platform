import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import type { SchemeModeField } from "../types/scheme.types";
import { getModeHeading, getModeOption, MODE_FIELDS } from "../utils/scheme-mode-labels";

interface SchemeRulesListProps {
  values: Partial<Record<SchemeModeField, string>>;
}

/**
 * The four rules a scheme runs by, each with what it means in a line.
 * Used for the details page and as the live preview on the forms, so the
 * consequence of a choice is visible before it is saved.
 */
export function SchemeRulesList({ values }: SchemeRulesListProps) {
  const { mode } = useExperienceMode();

  return (
    <dl className="grid gap-3">
      {MODE_FIELDS.map((field) => {
        const option = getModeOption(mode, field, values[field]);
        return (
          <div key={field}>
            <dt className="text-xs text-[var(--muted-foreground)]">{getModeHeading(mode, field)}</dt>
            <dd className="mt-0.5">
              <div className="text-sm font-medium">{option?.label ?? "Not chosen yet"}</div>
              {option ? (
                <div className="text-xs leading-5 text-[var(--muted-foreground)]">
                  {option.description}
                </div>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
