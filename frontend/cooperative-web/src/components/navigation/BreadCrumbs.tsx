import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { cn } from "@/lib/utils/cn";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { appPath } = useTenantNavigation();

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "mb-4 flex flex-wrap items-center gap-1 text-sm text-[var(--muted-foreground)]",
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.to && !isLast ? (
              <Link
                to={appPath(item.to)}
                className="rounded-md px-1.5 py-1 hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              >
                {item.label}
              </Link>
            ) : (
              <span className="px-1.5 py-1 font-medium text-[var(--foreground)]">
                {item.label}
              </span>
            )}

            {!isLast ? <ChevronRight className="size-4" /> : null}
          </div>
        );
      })}
    </nav>
  );
}