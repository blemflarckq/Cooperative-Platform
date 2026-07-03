import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-xl border border-[var(--input)] bg-white px-3 py-2 text-sm text-[var(--foreground)] shadow-sm transition",
        "placeholder:text-[var(--muted-foreground)]",
        "hover:border-[var(--primary)]/60",
        "focus-visible:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)]/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-[var(--card)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
