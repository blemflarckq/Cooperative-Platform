import { useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTableCard } from "@/components/data-display/DataTableCard";
import { PaginationFooter } from "@/components/data-display/PaginationFooter";
import { TableToolbar } from "@/components/data-display/TableToolbar";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatDate } from "@/lib/formatting/date";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { useJournalEntries } from "../hooks/useJournalEntries";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";

export function JournalEntriesPage() {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sourceModule, setSourceModule] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const debouncedSearch = useDebouncedValue(search, 400);

  const journalEntriesQuery = useJournalEntries({
    page,
    limit: 20,
    search: debouncedSearch,
    status,
    sourceModule,
    dateFrom,
    dateTo,
  });

  const entries = journalEntriesQuery.data?.data ?? [];
  const meta = journalEntriesQuery.data?.meta;

  if (journalEntriesQuery.isLoading) return <LoadingState />;
  if (journalEntriesQuery.isError) {
    return <ErrorState title="Could not load journal entries" />;
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Journal Entries" },
        ]}
      />
      <PageHeader
        title="Journal Entries"
        description="Review posted accounting entries, audit financial activity, and post expert manual journals when needed."
        actions={
          <PermissionGate permissions={["journal_entry:post_manual"]}>
            <Button
              onClick={() => navigate(appPath("/accounting/journal-entries/new"))}
            >
              <Plus className="mr-2 size-4" />
              Manual Journal
            </Button>
          </PermissionGate>
        }
      />

      <DataTableCard
        toolbar={
          <TableToolbar
            searchValue={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            searchPlaceholder="Search by journal number, description, or reference..."
            filters={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={status || "all"}
                  onValueChange={(value) => {
                    setStatus(value === "all" ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="POSTED">Posted</SelectItem>
                    <SelectItem value="REVERSED">Reversed</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={sourceModule || "all"}
                  onValueChange={(value) => {
                    setSourceModule(value === "all" ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="CONTRIBUTION">Contribution</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-40"
                />

                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-40"
                />
              </div>
            }
          />
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {entries.map((entry) => (
                <TableRow
                  key={entry.id}
                  className="cursor-pointer hover:bg-[var(--secondary)]"
                  onClick={() =>
                    navigate(appPath(`/accounting/journal-entries/${entry.id}`))
                  }
                >
                  <TableCell className="font-medium">
                    {entry.entryNumber}
                  </TableCell>
                  <TableCell>{formatDate(entry.transactionDate)}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>{entry.sourceModule}</TableCell>
                  <TableCell>
                    <StatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell>{entry.sourceReference ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {meta ? <PaginationFooter meta={meta} onPageChange={setPage} /> : null}
      </DataTableCard>
    </div>
  );
}