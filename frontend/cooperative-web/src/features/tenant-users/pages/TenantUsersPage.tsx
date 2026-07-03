import { useMemo, useState } from "react";
//import { useNavigate } from "react-router";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTableCard } from "@/components/data-display/DataTableCard";
import { TableToolbar } from "@/components/data-display/TableToolbar";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
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
import { RoleChips } from "@/features/tenant-users/components/RoleChips";
import { useTenantUsers } from "@/features/tenant-users/hooks/useTenantUsers";
import type { TenantUserStatus } from "@/features/tenant-users/types/tenant-user.types";

type StatusFilter = "all" | TenantUserStatus;

export function TenantUsersPage() {
  //const navigate = useNavigate();
  const { navigateToApp } = useTenantNavigation();
  const tenantUsersQuery = useTenantUsers();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const tenantUsers = useMemo(
    () => tenantUsersQuery.data ?? [],
    [tenantUsersQuery.data],
  );

  const filteredTenantUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tenantUsers.filter((tenantUser) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        tenantUser.fullName.toLowerCase().includes(normalizedSearch) ||
        tenantUser.email.toLowerCase().includes(normalizedSearch) ||
        tenantUser.roles.some((role) =>
          role.name.toLowerCase().includes(normalizedSearch),
        ) ||
        tenantUser.roles.some((role) =>
          role.code.toLowerCase().includes(normalizedSearch),
        );

      const matchesStatus =
        status === "all" || tenantUser.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [tenantUsers, search, status]);

  if (tenantUsersQuery.isLoading) return <LoadingState />;

  if (tenantUsersQuery.isError) {
    return (
      <ErrorState
        title="Could not load members"
        description="The tenant memberships could not be loaded. Please check the API connection and try again."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage users and their tenant-specific access for this cooperative."
        actions={
          <PermissionGate permissions={["user:create"]}>
            <Button onClick={() => navigateToApp("/members/new")}>
              <Plus className="mr-2 size-4" />
              Add Member
            </Button>
          </PermissionGate>
        }
      />

      {tenantUsers.length === 0 ? (
        <EmptyState
          title="No members found"
          description="Start by adding a user membership to this tenant."
          icon={<Users className="size-5" />}
          action={
            <PermissionGate permissions={["tenant_users.create"]}>
              <Button onClick={() => navigateToApp("/members/new")}>
                <Plus className="mr-2 size-4" />
                Add First Member
              </Button>
            </PermissionGate>
          }
        />
      ) : (
        <DataTableCard
          toolbar={
            <TableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by name, email, or role..."
              filters={
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as StatusFilter)}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          }
        >
          {filteredTenantUsers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No matching members"
                description="Try changing your search text or selected status filter."
                icon={<Users className="size-5" />}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredTenantUsers.map((tenantUser) => (
                    <TableRow
                      key={tenantUser.id}
                      onClick={() => navigateToApp(`/members/${tenantUser.id}`)}
                      className="cursor-pointer hover:bg-secondary"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {tenantUser.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tenantUser.userIsActive
                              ? "User account active"
                              : "User account inactive"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>{tenantUser.email}</TableCell>

                      <TableCell>
                        <StatusBadge status={tenantUser.status} />
                      </TableCell>

                      <TableCell>
                        <RoleChips roles={tenantUser.roles} />
                      </TableCell>

                      <TableCell>
                        {new Date(tenantUser.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DataTableCard>
      )}
    </div>
  );
}