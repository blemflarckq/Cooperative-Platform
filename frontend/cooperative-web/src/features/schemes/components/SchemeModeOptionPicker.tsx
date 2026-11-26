import { cn } from "@/lib/utils/cn";
import type { ModeOption } from "../utils/scheme-mode-labels";

interface SchemeModeOptionPickerProps<TValue extends string> {
  label: string;
  value: TValue;
  options: Record<string, ModeOption>;
  onChange: (value: TValue) => void;
  disabled?: boolean;
}

/**
 * One rule, as a short list of choices. Selection is shown with the
 * neutral foreground colour, never the accent — the screen's one accent
 * is the button that saves.
 */
export function SchemeModeOptionPicker<TValue extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: SchemeModeOptionPickerProps<TValue>) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2">
      {Object.entries(options).map(([optionValue, option]) => {
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(optionValue as TValue)}
            className={cn(
              "rounded-xl border bg-[var(--card)] p-3 text-left transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/20 disabled:opacity-60",
              selected ? "border-[var(--foreground)]/40 bg-[var(--secondary)]" : "border-[var(--border)]",
            )}
          >
            <div className="text-sm font-medium">{option.label}</div>
            <div className="mt-0.5 text-xs leading-5 text-[var(--muted-foreground)]">
              {option.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
