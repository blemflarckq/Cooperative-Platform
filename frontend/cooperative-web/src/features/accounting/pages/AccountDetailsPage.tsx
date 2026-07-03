import { Archive, Ban } from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionGate } from "@/components/common/PermissionGate";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatting/date";
import { useAccount } from "../hooks/useAccount";
import { useAccountTransition } from "../hooks/useAccountTransition";
import { Breadcrumbs } from "@/components/navigation/BreadCrumbs";

export function AccountDetailsPage() {
  const { accountId } = useParams<{ accountId: string }>();

  const accountQuery = useAccount(accountId!);
  const transitionMutation = useAccountTransition();

  if (accountQuery.isLoading) return <LoadingState />;
  if (accountQuery.isError || !accountQuery.data) {
    return <ErrorState title="Could not load account" />;
  }

  const account = accountQuery.data;

  function runTransition(transition: "deactivate" | "archive") {
    transitionMutation.mutate(
      { accountId: account.id, transition },
      {
        onSuccess: () => {
          toast.success(
            transition === "archive"
              ? "Account archived"
              : "Account deactivated",
          );
        },
      },
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Finance" },
          { label: "Accounts", to: "/accounting/accounts" },
          { label: `${account.code} · ${account.name}` },
        ]}
      />
      <PageHeader
        title={`${account.code} · ${account.name}`}
        description="Review account configuration and lifecycle status."
        backTo="/accounting/accounts"
        backLabel="Back to Accounts"
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permissions={["account:deactivate"]}>
              <ConfirmActionDialog
                title="Deactivate account?"
                description="This will make the account unavailable for future postings. Existing journal entries remain unchanged."
                confirmLabel="Deactivate Account"
                loadingLabel="Deactivating..."
                isLoading={transitionMutation.isPending}
                disabled={
                  account.status !== "ACTIVE" ||
                  account.isSystem ||
                  transitionMutation.isPending
                }
                onConfirm={() => runTransition("deactivate")}
                trigger={
                  <Button
                    variant="outline"
                    disabled={
                      account.status !== "ACTIVE" ||
                      account.isSystem ||
                      transitionMutation.isPending
                    }
                    className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    <Ban className="mr-2 size-4" />
                    Deactivate
                  </Button>
                }
              />
            </PermissionGate>

            <PermissionGate permissions={["account:archive"]}>
              <ConfirmActionDialog
                title="Archive account?"
                description="Archived accounts should be treated as retired. Use this only when the account is no longer operational."
                confirmLabel="Archive Account"
                loadingLabel="Archiving..."
                variant="destructive"
                isLoading={transitionMutation.isPending}
                disabled={
                  account.status === "ARCHIVED" ||
                  account.isSystem ||
                  transitionMutation.isPending
                }
                onConfirm={() => runTransition("archive")}
                trigger={
                  <Button
                    variant="destructive"
                    disabled={
                      account.status === "ARCHIVED" ||
                      account.isSystem ||
                      transitionMutation.isPending
                    }
                  >
                    <Archive className="mr-2 size-4" />
                    Archive
                  </Button>
                }
              />
            </PermissionGate>
          </div>
        }
      />

      {account.isSystem ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          This is a system account. Some fields and lifecycle actions are
          restricted because it may be used by accounting settings.
        </div>
      ) : null}

      <Card className="border-[var(--border)] bg-[var(--card)]">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <Detail label="Code" value={account.code} />
          <Detail label="Name" value={account.name} />
          <Detail label="Type" value={account.type} />
          <Detail label="Normal Balance" value={account.normalBalance} />
          <Detail label="Status" value={<StatusBadge status={account.status} />} />
          <Detail label="System Account" value={account.isSystem ? "Yes" : "No"} />
          <Detail label="Created" value={formatDateTime(account.createdAt)} />
          <Detail label="Updated" value={formatDateTime(account.updatedAt)} />
          <Detail
            label="Description"
            value={account.description ?? "No description provided"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-medium text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}