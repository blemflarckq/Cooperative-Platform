import { useState } from "react";
import { CalendarRange, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
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
import { formatDate, formatDateTime } from "@/lib/formatting/date";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { useAccountingPeriods } from "../hooks/useAccountingPeriods";
import { useCloseAccountingPeriod } from "../hooks/useCloseAccountingPeriod";

export function AccountingPeriodsPage() {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const debouncedSearch = useDebouncedValue(search, 400);

  const periodsQuery = useAccountingPeriods({
    page,
    limit: 20,
    search: debouncedSearch,
    status,
  });

  const closeMutation = useCloseAccountingPeriod();

  const periods = periodsQuery.data?.data ?? [];
  const meta = periodsQuery.data?.meta;

  if (periodsQuery.isLoading) return <LoadingState />;

  if (periodsQuery.isError) {
    return <ErrorState title="Could not load accounting periods" />;
  }

  function handleClose(periodId: string) {
    closeMutation.mutate(periodId, {
      onSuccess: () => toast.success("Accounting period closed"),
    });
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Accounting Periods" },
        ]}
      />

      <PageHeader
        title="Accounting Periods"
        description="Create and close accounting periods to control financial reporting boundaries."
        actions={
          <PermissionGate permissions={["accounting_period:create"]}>
            <Button
              onClick={() => navigate(appPath("/accounting/periods/new"))}
            >
              <Plus className="mr-2 size-4" />
              Create Period
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
            searchPlaceholder="Search periods by name..."
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
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        }
      >
        {periods.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No accounting periods found"
              description="Create the first reporting period for this tenant."
              icon={<CalendarRange className="size-5" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Closed At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {period.name}
                    </TableCell>
                    <TableCell>{period.code}</TableCell>
                    <TableCell>{formatDate(period.startsOn)}</TableCell>
                    <TableCell>{formatDate(period.endsOn)}</TableCell>
                    <TableCell>
                      <StatusBadge status={period.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(period.closedAt)}</TableCell>
                    <TableCell className="text-right">
                      <PermissionGate permissions={["accounting_period:close"]}>
                        <ConfirmActionDialog
                          title="Close accounting period?"
                          description="Closing an accounting period is a serious control action. Once closed, this period should no longer accept financial activity."
                          confirmLabel="Close Period"
                          loadingLabel="Closing..."
                          variant="destructive"
                          isLoading={closeMutation.isPending}
                          disabled={
                            period.status !== "OPEN" ||
                            closeMutation.isPending
                          }
                          onConfirm={() => handleClose(period.id)}
                          trigger={
                            <Button
                              variant="destructive"
                              disabled={
                                period.status !== "OPEN" ||
                                closeMutation.isPending
                              }
                            >
                              Close Period
                            </Button>
                          }
                        />
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {meta ? <PaginationFooter meta={meta} onPageChange={setPage} /> : null}
      </DataTableCard>
    </div>
  );
}