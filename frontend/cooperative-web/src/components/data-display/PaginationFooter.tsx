import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/lib/api/pagination.types";

interface PaginationFooterProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PaginationFooter({
  meta,
  onPageChange,
}: PaginationFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--muted-foreground)]">
        Page {meta.page} of {meta.pageCount} · {meta.total} total
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!meta.hasPreviousPage}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}