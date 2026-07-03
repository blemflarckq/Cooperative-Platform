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
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { useAccounts } from "../hooks/useAccounts";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";

export function AccountsPage() {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const debouncedSearch = useDebouncedValue(search, 400);

  const accountsQuery = useAccounts({
    page,
    limit: 20,
    search: debouncedSearch,
    status,
    type,
  });

  const accounts = accountsQuery.data?.data ?? [];
  const meta = accountsQuery.data?.meta;

  if (accountsQuery.isLoading) return <LoadingState />;
  if (accountsQuery.isError) {
    return <ErrorState title="Could not load accounts" />;
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Accounts" },
        ]}
      />
      <PageHeader
        title="Accounts"
        description="Manage the chart of accounts used by contributions, loans, interest, penalties, and manual journals."
        actions={
          <PermissionGate permissions={["account:create"]}>
            <Button onClick={() => navigate(appPath("/accounting/accounts/new"))}>
              <Plus className="mr-2 size-4" />
              Create Account
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
            searchPlaceholder="Search by code or account name..."
            filters={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={type || "all"}
                  onValueChange={(value) => {
                    setType(value === "all" ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="ASSET">Asset</SelectItem>
                    <SelectItem value="LIABILITY">Liability</SelectItem>
                    <SelectItem value="EQUITY">Equity</SelectItem>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>

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
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Normal Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>System</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {accounts.map((account) => (
                <TableRow
                  key={account.id}
                  className="cursor-pointer hover:bg-[var(--secondary)]"
                  onClick={() =>
                    navigate(appPath(`/accounting/accounts/${account.id}`))
                  }
                >
                  <TableCell className="font-medium">{account.code}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.type}</TableCell>
                  <TableCell>{account.normalBalance}</TableCell>
                  <TableCell>
                    <StatusBadge status={account.status} />
                  </TableCell>
                  <TableCell>{account.isSystem ? "Yes" : "No"}</TableCell>
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