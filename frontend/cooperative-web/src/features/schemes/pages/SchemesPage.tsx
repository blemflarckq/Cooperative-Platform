import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Layers, Plus } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTableCard } from "@/components/data-display/DataTableCard";
import { PaginationFooter } from "@/components/data-display/PaginationFooter";
import { TableToolbar } from "@/components/data-display/TableToolbar";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { cn } from "@/lib/utils/cn";

import { useSchemes } from "../hooks/useSchemes";
import { getFundRuleSummary } from "../utils/get-fund-rule-summary";

const communityStatusOptions = [
  { value: "DRAFT", label: "Being Set Up" },
  { value: "ACTIVE", label: "Ready To Use" },
  { value: "SUSPENDED", label: "Temporarily Stopped" },
  { value: "ARCHIVED", label: "Closed" },
];

const professionalStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "Archived" },
];

export function SchemesPage() {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const debouncedSearch = useDebouncedValue(search, 400);

  const schemesQuery = useSchemes({
    page,
    limit: 10,
    search: debouncedSearch,
    status,
  });

  const schemes = schemesQuery.data?.data ?? [];
  const meta = schemesQuery.data?.meta;

  const statusOptions = isCommunityMode
    ? communityStatusOptions
    : professionalStatusOptions;

  const pageTitle = t.terms("scheme");
  const createLabel = isCommunityMode ? "Create Group Fund" : "Create Scheme";
  const createFirstLabel = isCommunityMode
    ? "Create First Group Fund"
    : "Create First Scheme";

  if (schemesQuery.isLoading) return <LoadingState />;

  if (schemesQuery.isError) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load group funds"
            : "Could not load schemes"
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description={
          isCommunityMode
            ? "Create and manage the funds your group uses to collect money, support people, save together, or run projects."
            : "Define cooperative financial models such as savings schemes, welfare funds, and project-based contribution pools."
        }
        actions={
          <PermissionGate permissions={["scheme:create"]}>
            <Button onClick={() => navigate(appPath("/schemes/new"))}>
              <Plus className="mr-2 size-4" />
              {createLabel}
            </Button>
          </PermissionGate>
        }
      />

      {schemes.length === 0 ? (
        <EmptyState
          title={
            isCommunityMode ? "No group funds found" : "No schemes found"
          }
          description={
            isCommunityMode
              ? "Create your first group fund so your community can start organizing people and money around a clear purpose."
              : "Create the first cooperative scheme for this tenant."
          }
          icon={<Layers className="size-5" />}
          action={
            <PermissionGate permissions={["scheme:create"]}>
              <Button onClick={() => navigate(appPath("/schemes/new"))}>
                <Plus className="mr-2 size-4" />
                {createFirstLabel}
              </Button>
            </PermissionGate>
          }
        />
      ) : (
        <DataTableCard
          toolbar={
            <TableToolbar
              searchValue={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              searchPlaceholder={
                isCommunityMode
                  ? "Search group funds by name or code..."
                  : "Search schemes by name or code..."
              }
              filters={
                <Select
                  value={status || "all"}
                  onValueChange={(value) => {
                    setStatus(value === "all" ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>

                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          }
        >
          {isCommunityMode ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {schemes.map((scheme) => {
                const rules = getFundRuleSummary({
                  cycleMode: scheme.cycleMode,
                  contributionMode: scheme.contributionMode,
                  loanMode: scheme.loanMode,
                  payoutMode: scheme.payoutMode,
                });

                return (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => navigate(appPath(`/schemes/${scheme.id}`))}
                    className={cn(
                      "group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left transition",
                      "hover:border-[var(--primary)] hover:bg-[var(--secondary)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-[var(--foreground)]">
                          {scheme.name}
                        </p>

                        {scheme.code ? (
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            Code: {scheme.code}
                          </p>
                        ) : null}
                      </div>

                      <StatusBadge status={scheme.status} />
                    </div>

                    {scheme.description ? (
                      <p className="mt-3 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                        {scheme.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                        No description added yet.
                      </p>
                    )}

                    <div className="mt-4 space-y-2">
                      {rules.map((rule) => (
                        <div key={rule.id} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                          <p className="text-sm text-[var(--foreground)]">
                            {rule.text}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                      <span className="text-sm font-medium text-[var(--primary)]">
                        View fund overview
                      </span>

                      <ArrowRight className="size-4 text-[var(--primary)] transition group-hover:translate-x-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cycle Mode</TableHead>
                    <TableHead>Contribution</TableHead>
                    <TableHead>Loan</TableHead>
                    <TableHead>Payout</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {schemes.map((scheme) => (
                    <TableRow
                      key={scheme.id}
                      className="cursor-pointer hover:bg-[var(--secondary)]"
                      onClick={() =>
                        navigate(appPath(`/schemes/${scheme.id}`))
                      }
                    >
                      <TableCell className="font-medium">
                        {scheme.name}
                      </TableCell>
                      <TableCell>{scheme.code}</TableCell>
                      <TableCell>
                        <StatusBadge status={scheme.status} />
                      </TableCell>
                      <TableCell>{scheme.cycleMode}</TableCell>
                      <TableCell>{scheme.contributionMode}</TableCell>
                      <TableCell>{scheme.loanMode}</TableCell>
                      <TableCell>{scheme.payoutMode}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {meta ? <PaginationFooter meta={meta} onPageChange={setPage} /> : null}
        </DataTableCard>
      )}
    </div>
  );
}