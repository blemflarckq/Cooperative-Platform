import { BriefcaseBusiness, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";

export function ExperienceModeSwitcher() {
  const { mode, setMode } = useExperienceMode();

  const isCommunity = mode === "community";

  return (
    <div className="hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm md:flex">
      <button
        type="button"
        onClick={() => setMode("community")}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
          isCommunity
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
            : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
        )}
      >
        <HeartHandshake className="size-4" />
        Community
      </button>

      <button
        type="button"
        onClick={() => setMode("professional")}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
          !isCommunity
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
            : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
        )}
      >
        <BriefcaseBusiness className="size-4" />
        Professional
      </button>
    </div>
  );
}