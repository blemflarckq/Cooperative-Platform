import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * The one definition of "how wide is a page." Phone-first (a single
 * narrow column) and widening at the standard breakpoints, so the same
 * screen reads properly on a laptop instead of being a phone-width strip
 * floating in the middle. Pure CSS — nothing is detected or switched in
 * JavaScript. Earlier new pages hardcoded max-w-md individually; those
 * should adopt this as they're next touched.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-5 md:max-w-3xl md:px-6 lg:max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
