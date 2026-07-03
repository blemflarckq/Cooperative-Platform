import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { BadgeDollarSign, Search, UserRound } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTenantUsers } from "@/features/tenant-users/hooks/useTenantUsers";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

export function SavingsReportsPage() {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const [search, setSearch] = useState("");

  const tenantUsersQuery = useTenantUsers();

  const tenantUsers = tenantUsersQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tenantUsers
      .filter((tenantUser) => tenantUser.membershipIsActive)
      .filter((tenantUser) => {
        if (!normalizedSearch) return true;

        return (
          tenantUser.fullName.toLowerCase().includes(normalizedSearch) ||
          tenantUser.email.toLowerCase().includes(normalizedSearch) ||
          tenantUser.roles.some((role) =>
            role.name.toLowerCase().includes(normalizedSearch),
          )
        );
      });
  }, [tenantUsers, search]);

  if (tenantUsersQuery.isLoading) return <LoadingState />;

  if (tenantUsersQuery.isError) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load members"
            : "Could not load tenant users"
        }
        description={getApiErrorMessage(tenantUsersQuery.error)}
      />
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Reports" },
          {
            label: isCommunityMode
              ? "Savings Reports"
              : "Savings Statements",
          },
        ]}
      />

      <PageHeader
        title={isCommunityMode ? "Savings Reports" : "Savings Statements"}
        description={
          isCommunityMode
            ? "Choose a member to view their savings record, payments, corrections, and net saved amount."
            : "Choose a tenant user to view their member savings statement."
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BadgeDollarSign className="size-5 text-[var(--primary)]" />
                {isCommunityMode
                  ? `Choose ${t.term("participant")}`
                  : "Choose Member"}
              </CardTitle>

              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {isCommunityMode
                  ? "Select the person whose savings report you want to open."
                  : "Select a tenant user whose savings statement you want to open."}
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isCommunityMode
                    ? "Search member by name, email, or role..."
                    : "Search user by name, email, or role..."
                }
                className="pl-9"
              />
            </div>
          </CardHeader>

          <CardContent>
            {filteredUsers.length === 0 ? (
              <EmptyState
                title={
                  isCommunityMode
                    ? "No members found"
                    : "No tenant users found"
                }
                description={
                  isCommunityMode
                    ? "Try a different search, or add members first."
                    : "Try a different search, or create tenant users first."
                }
                icon={<UserRound className="size-5" />}
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredUsers.map((tenantUser) => (
                  <button
                    key={tenantUser.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        appPath(
                          `/reports/${tenantUser.id}/savings-statement`,
                        ),
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-4 text-left transition hover:bg-[var(--secondary)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">
                        {tenantUser.fullName}
                      </p>

                      <p className="truncate text-sm text-[var(--muted-foreground)]">
                        {tenantUser.email}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {tenantUser.roles.slice(0, 3).map((role) => (
                          <span
                            key={role.id}
                            className="rounded-lg bg-[var(--secondary)] px-2 py-1 text-xs text-[var(--muted-foreground)]"
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge
                        status={
                          tenantUser.membershipIsActive ? "ACTIVE" : "INACTIVE"
                        }
                      />

                      <Button type="button" variant="outline" size="sm">
                        {isCommunityMode ? "Open Report" : "Open Statement"}
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[var(--card)]">
          <CardHeader>
            <CardTitle>
              {isCommunityMode
                ? "What this report shows"
                : "Savings Statement Contents"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-[var(--muted-foreground)]">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
              <p className="font-semibold text-[var(--foreground)]">
                {isCommunityMode ? "Money recorded" : "Posted contributions"}
              </p>
              <p className="mt-1">
                {isCommunityMode
                  ? "All money received from the selected member."
                  : "All posted contribution entries for the selected member."}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
              <p className="font-semibold text-[var(--foreground)]">
                {isCommunityMode ? "Corrections" : "Reversals"}
              </p>
              <p className="mt-1">
                {isCommunityMode
                  ? "Any records that were corrected because of duplicate receipts, wrong amounts, or other mistakes."
                  : "Any reversing entries posted against incorrect contributions."}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)] p-4">
              <p className="font-semibold text-[var(--foreground)]">
                {isCommunityMode ? "Net saved" : "Net savings"}
              </p>
              <p className="mt-1">
                {isCommunityMode
                  ? "The member’s savings after corrections are considered."
                  : "The member’s net savings balance based on posted and reversed contribution activity."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}