import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

/**
 * Standard page heading block used across feature pages.
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;

  /**
   * Optional parent route for nested pages.
   * When provided, PageHeader automatically shows a back button.
   */
  backTo?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel = "Back",
}: PageHeaderProps) {
  //const navigate = useNavigate();
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  function resolveBackPath(path: string) {
    // Allows external/full routes if ever needed.
    if (path.startsWith("http")) return path;

    // Already tenant-aware full app path:
    if (path.includes("/app/")) return path;

    // App-relative standard:
    // "/members" -> "/tenant/app/members"
    return appPath(path);
  }

  return (
    <div className="mb-6">
      {backTo ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate(resolveBackPath(backTo))}
          className="mb-4 -ml-2 gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Button>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:shrink-0 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}