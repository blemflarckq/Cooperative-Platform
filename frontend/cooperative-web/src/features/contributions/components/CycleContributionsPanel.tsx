import { useState } from "react";
import { ExternalLink, Plus, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router";

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
import { formatCurrency } from "@/lib/formatting/currency";
import { formatDate } from "@/lib/formatting/date";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useCycleContributions } from "../hooks/useCycleContributions";
import { ReverseContributionDialog } from "./ReverseContributionDialog";

interface CycleContributionsPanelProps {
  cycleId: string;
  cycleStatus: string;
}

const communityStatusOptions = [
  { value: "POSTED", label: "Recorded" },
  { value: "REVERSED", label: "Corrected / Reversed" },
];

const professionalStatusOptions = [
  { value: "POSTED", label: "Posted" },
  { value: "REVERSED", label: "Reversed" },
];

const sourceOptions = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "OTHER", label: "Other" },
];

export function CycleContributionsPanel({
  cycleId,
  cycleStatus,
}: CycleContributionsPanelProps) {
  const navigate = useNavigate();
  const { appPath } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  const debouncedSearch = useDebouncedValue(search, 400);

  const contributionsQuery = useCycleContributions(cycleId, {
    page,
    limit: 10,
    search: debouncedSearch,
    status,
    source,
  });

  const contributions = contributionsQuery.data?.data ?? [];
  const meta = contributionsQuery.data?.meta;

  const statusOptions = isCommunityMode
    ? communityStatusOptions
    : professionalStatusOptions;

  const pageTitle = isCommunityMode ? "Money Received" : "Contributions";
  const recordLabel = isCommunityMode
    ? "Record Money Received"
    : "Record Contribution";

  if (contributionsQuery.isLoading) return <LoadingState />;

  if (contributionsQuery.isError) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load money received"
            : "Could not load contributions"
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
            ? "Track money recorded from members during this activity period. Corrections are handled safely through reversals."
            : "Track posted member contributions and reverse incorrect entries when necessary."
        }
        actions={
          <PermissionGate permissions={["contribution:create"]}>
            <Button
              disabled={cycleStatus !== "OPEN"}
              onClick={() =>
                navigate(appPath(`/cycles/${cycleId}/contributions/new`))
              }
            >
              <Plus className="mr-2 size-4" />
              {recordLabel}
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
            searchPlaceholder={
              isCommunityMode
                ? "Search by receipt reference or notes..."
                : "Search by reference or notes..."
            }
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

                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={source || "all"}
                  onValueChange={(value) => {
                    setSource(value === "all" ? "" : value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue
                      placeholder={
                        isCommunityMode
                          ? t.term("contributionSource")
                          : "Source"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">
                      {isCommunityMode ? "All payment methods" : "All sources"}
                    </SelectItem>

                    {sourceOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          />
        }
      >
        {contributions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={
                isCommunityMode
                  ? "No money received yet"
                  : "No contributions found"
              }
              description={
                isCommunityMode
                  ? "Money recorded from members in this activity period will appear here."
                  : "Posted contributions for this cycle will appear here."
              }
              icon={<ReceiptText className="size-5" />}
              action={
                <PermissionGate permissions={["contribution:create"]}>
                  <Button
                    disabled={cycleStatus !== "OPEN"}
                    onClick={() =>
                      navigate(appPath(`/cycles/${cycleId}/contributions/new`))
                    }
                  >
                    <Plus className="mr-2 size-4" />
                    {isCommunityMode
                      ? "Record First Money Received"
                      : "Record First Contribution"}
                  </Button>
                </PermissionGate>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {isCommunityMode ? "Receipt Reference" : "Reference"}
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>
                    {isCommunityMode
                      ? t.term("contributionSource")
                      : "Source"}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    {isCommunityMode ? "Financial Record" : "Journal"}
                  </TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {contributions.map((contribution) => (
                  <TableRow key={contribution.id}>
                    <TableCell className="font-medium">
                      {contribution.reference}
                    </TableCell>

                    <TableCell>
                      {formatDate(contribution.contributionDate)}
                    </TableCell>

                    <TableCell>{formatCurrency(contribution.amount)}</TableCell>

                    <TableCell>
                      {contribution.source.replaceAll("_", " ")}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={contribution.status} />
                    </TableCell>

                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(
                            appPath(
                              `/accounting/journal-entries/${contribution.journalEntryId}`,
                            ),
                          )
                        }
                        className="gap-2"
                      >
                        <ExternalLink className="size-3.5" />
                        {isCommunityMode
                          ? "View Financial Record"
                          : "View Journal"}
                      </Button>
                    </TableCell>

                    <TableCell className="text-right">
                      <PermissionGate permissions={["contribution:reverse"]}>
                        <ReverseContributionDialog
                          contribution={contribution}
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