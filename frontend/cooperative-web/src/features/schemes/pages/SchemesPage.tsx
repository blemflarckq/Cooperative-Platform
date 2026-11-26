import { useState } from "react";
import { useNavigate } from "react-router";
import { Layers, Plus } from "lucide-react";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { cn } from "@/lib/utils/cn";

import { SchemeStatusBadge } from "../components/SchemeStatusBadge";
import { useSchemes } from "../hooks/useSchemes";
import { useSchemeWords } from "../hooks/useSchemeWords";
import { summariseModes } from "../utils/scheme-mode-labels";

const cardClass =
  "gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
];

/** Search and filters only appear once there are enough to need them. */
const TOOLS_FROM = 6;

export function SchemesPage() {
  const navigate = useNavigate();
  const { appPath, navigateToApp } = useTenantNavigation();
  const { mode } = useExperienceMode();
  const { hasPermission } = useAuth();
  const words = useSchemeWords();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const schemesQuery = useSchemes({ page, limit: 10, search: debouncedSearch, status });

  if (schemesQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (schemesQuery.isError || !schemesQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title={`Could not load ${words.plural}`}
          description="Check the connection and try again."
        />
      </PageContainer>
    );
  }

  const schemes = schemesQuery.data.data;
  const meta = schemesQuery.data.meta;
  const isFiltering = Boolean(debouncedSearch.trim() || status);
  const showTools = isFiltering || search !== "" || meta.total >= TOOLS_FROM;
  const canCreate = hasPermission(["scheme:create"]);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setPage(1);
  }

  return (
    <PageContainer>
      <PageHeader
        title={words.Plural}
        description={
          words.isCommunityMode
            ? "Where your group's money is collected, lent and kept."
            : "The savings, welfare and project schemes your cooperative runs."
        }
        actions={
          <PermissionGate permissions={["scheme:create"]}>
            <Button onClick={() => navigateToApp("/schemes/new")}>
              <Plus className="mr-1.5 size-4" />
              New {words.noun}
            </Button>
          </PermissionGate>
        }
      />

      {showTools ? (
        <div className="grid gap-3">
          <Input
            aria-label={`Search ${words.plural}`}
            placeholder={`Search ${words.plural} by name or code`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((filter) => {
              const selected = status === filter.value;
              return (
                <button
                  key={filter.value || "all"}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setStatus(filter.value);
                    setPage(1);
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/20",
                    selected
                      ? "border-[var(--foreground)]/40 bg-[var(--secondary)] font-medium"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]",
                  )}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {schemes.length === 0 ? (
        isFiltering ? (
          <Card className={cn(cardClass, "items-start")}>
            <h2 className="text-sm font-medium">Nothing matches</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              No {words.plural} fit that search or filter.
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear search and filters
            </Button>
          </Card>
        ) : (
          <Card className={cn(cardClass, "items-start gap-3")}>
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--secondary)] text-[var(--muted-foreground)]">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-medium">No {words.plural} yet</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                A {words.noun} is where one pot of your group's money lives — savings, a burial
                fund, a building project. Members join it, contribute to it, and, if you allow it,
                borrow from it. Most groups start with one.
              </p>
            </div>
            {canCreate ? (
              <Button onClick={() => navigateToApp("/schemes/new")}>
                <Plus className="mr-1.5 size-4" />
                Create the first one
              </Button>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">
                An administrator or treasurer can create it.
              </p>
            )}
          </Card>
        )
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2">
          {schemes.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              onClick={() => navigate(appPath(`/schemes/${scheme.id}`))}
              className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/20"
            >
              <Card className={cn(cardClass, "h-full transition-colors hover:bg-[var(--secondary)]")}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 break-words text-sm font-medium">{scheme.name}</h2>
                  <SchemeStatusBadge status={scheme.status} />
                </div>
                {scheme.description ? (
                  <p className="line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">
                    {scheme.description}
                  </p>
                ) : null}
                <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                  {summariseModes(mode, scheme)}
                </p>
              </Card>
            </button>
          ))}
        </div>
      )}

      {meta.pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={!meta.hasPreviousPage}
            onClick={() => setPage(meta.page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-[var(--muted-foreground)]">
            Page {meta.page} of {meta.pageCount}
          </span>
          <Button
            variant="outline"
            disabled={!meta.hasNextPage}
            onClick={() => setPage(meta.page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </PageContainer>
  );
}
