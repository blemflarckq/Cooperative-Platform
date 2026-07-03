import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SchemeModeOptionPickerProps<TValue extends string> {
  value: TValue;
  options: TValue[];
  labels: Record<string, { label: string; description?: string }>;
  onChange: (value: TValue) => void;
}

export function SchemeModeOptionPicker<TValue extends string>({
  value,
  options,
  labels,
  onChange,
}: SchemeModeOptionPickerProps<TValue>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {options.map((option) => {
        const selected = value === option;
        const presentation = labels[option] ?? { label: option };

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "relative rounded-2xl border p-4 text-left transition",
              selected
                ? "border-[var(--primary)] bg-[var(--secondary)] shadow-sm"
                : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)]",
            )}
          >
            {selected ? (
              <CheckCircle2 className="absolute right-4 top-4 size-5 text-[var(--primary)]" />
            ) : null}

            <p className="pr-8 font-medium text-[var(--foreground)]">
              {presentation.label}
            </p>

            {presentation.description ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {presentation.description}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}