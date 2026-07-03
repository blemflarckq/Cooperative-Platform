import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  value?: number;
  className?: string;
}

export function Progress({ value = 0, className }: ProgressProps) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "h-3 w-full overflow-hidden rounded-full border border-[var(--border)] bg-[var(--secondary)]",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <div
        className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}