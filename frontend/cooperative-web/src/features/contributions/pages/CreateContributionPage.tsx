import { useMemo } from "react";
import { useParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Landmark, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getApiErrorMessage } from "@/lib/api/api-error";
import { useTerminology } from "@/lib/domain/useTerminology";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";

import { useCycleParticipants } from "@/features/cycle-participants/hooks/useCycleParticipants";
import { useCycle } from "@/features/cycles/hooks/useCycle";

import { useCreateContribution } from "../hooks/useCreateContribution";
import {
  contributionSchema,
  type ContributionFormValues,
} from "../schemas/contribution.schema";

export function CreateContributionPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { navigateToApp } = useTenantNavigation();
  const { isCommunityMode } = useExperienceMode();
  const t = useTerminology();

  const cycleQuery = useCycle(cycleId!);
  const participantsQuery = useCycleParticipants(cycleId!, {
    page: 1,
    limit: 200,
    status: "ACTIVE",
  });

  const mutation = useCreateContribution();

  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      tenantUserId: "",
      contributionDate: new Date().toISOString().slice(0, 10),
      amount: "",
      source: "MOBILE_MONEY",
      notes: "",
    },
  });

  const participants = participantsQuery.data?.data ?? [];

  const selectedTenantUserId = form.watch("tenantUserId");
  const amountPreview = form.watch("amount");

  const selectedParticipant = useMemo(() => {
    return participants.find(
      (participant) => participant.tenantUserId === selectedTenantUserId,
    );
  }, [participants, selectedTenantUserId]);

  const selectedUser = selectedParticipant?.tenantUser?.user;

  if (cycleQuery.isLoading || participantsQuery.isLoading) {
    return <LoadingState />;
  }

  if (cycleQuery.isError || !cycleQuery.data) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load activity period"
            : "Could not load cycle"
        }
      />
    );
  }

  if (participantsQuery.isError) {
    return (
      <ErrorState
        title={
          isCommunityMode
            ? "Could not load members"
            : "Could not load participants"
        }
      />
    );
  }

  const cycle = cycleQuery.data;

  const pageTitle = isCommunityMode
    ? "Record Money Received"
    : "Record Contribution";

  const pageDescription = isCommunityMode
    ? "Record money received from a member. The system will safely create the financial record behind the scenes."
    : "Post a member contribution safely. The system will automatically create the correct double-entry journal entry.";

  const backLabel = isCommunityMode ? `Back to ${t.term("cycle")}` : "Back to Cycle";

  function handleSubmit(values: ContributionFormValues) {
    mutation.mutate(
      {
        cycleId: cycle.id,
        values: {
          tenantUserId: values.tenantUserId,
          contributionDate: values.contributionDate,
          amount: values.amount,
          source: values.source,
          notes: values.notes,
        },
      },
      {
        onSuccess: (contribution) => {
          toast.success(
            isCommunityMode
              ? `Money received recorded: ${contribution.reference}`
              : `Contribution ${contribution.reference} posted`,
          );
          navigateToApp(`/cycles/${cycle.id}`);
        },
      },
    );
  }

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        backTo={`/cycles/${cycleId}`}
        backLabel={backLabel}
      />

      {cycle.status !== "OPEN" ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {isCommunityMode
            ? "Money can only be recorded when this activity period is collecting money."
            : "Contributions can only be recorded when the cycle is OPEN."}
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="mb-6">
          <ErrorState
            title={
              isCommunityMode
                ? "Could not record money received"
                : "Could not post contribution"
            }
            description={getApiErrorMessage(mutation.error)}
          />
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="size-5 text-[var(--primary)]" />
                {isCommunityMode
                  ? "Money Received Details"
                  : "Contribution Details"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <Field
                label={isCommunityMode ? "Who paid?" : "Participant"}
                error={form.formState.errors.tenantUserId?.message}
              >
                <Select
                  value={form.watch("tenantUserId")}
                  onValueChange={(value) =>
                    form.setValue("tenantUserId", value, {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isCommunityMode
                          ? "Select member"
                          : "Select active participant"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {participants.map((participant) => {
                      const user = participant.tenantUser?.user;
                      const name = user
                        ? `${user.firstName} ${user.lastName}`.trim()
                        : participant.tenantUserId;

                      return (
                        <SelectItem
                          key={participant.id}
                          value={participant.tenantUserId}
                        >
                          {name} · {user?.email ?? "No email"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label={
                    isCommunityMode
                      ? "When was it received?"
                      : "Contribution Date"
                  }
                  error={form.formState.errors.contributionDate?.message}
                >
                  <Input type="date" {...form.register("contributionDate")} />
                </Field>

                <Field
                  label={
                    isCommunityMode ? "How much was received?" : "Amount"
                  }
                  error={form.formState.errors.amount?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="250.00"
                    {...form.register("amount")}
                  />
                </Field>
              </div>

              <Field
                label={isCommunityMode ? "How was it paid?" : "Source"}
                error={form.formState.errors.source?.message}
              >
                <Select
                  value={form.watch("source")}
                  onValueChange={(value) =>
                    form.setValue(
                      "source",
                      value as ContributionFormValues["source"],
                      { shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label={isCommunityMode ? "Notes or receipt reference" : "Notes"}
                error={form.formState.errors.notes?.message}
              >
                <Input
                  placeholder={
                    isCommunityMode
                      ? "Optional note, receipt number, month, or payment reference"
                      : "Optional note, receipt reference, or month"
                  }
                  {...form.register("notes")}
                />
              </Field>

              <div className="flex justify-end border-t border-[var(--border)] pt-5">
                <Button
                  type="submit"
                  disabled={mutation.isPending || cycle.status !== "OPEN"}
                >
                  {mutation.isPending
                    ? isCommunityMode
                      ? "Recording..."
                      : "Posting..."
                    : isCommunityMode
                      ? "Record Money Received"
                      : "Post Contribution"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] bg-[var(--card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="size-5 text-[var(--primary)]" />
                {isCommunityMode ? "Record Preview" : "Posting Preview"}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <PreviewRow
                label={isCommunityMode ? t.term("cycle") : "Cycle"}
                value={`${cycle.name} (${cycle.status})`}
              />

              <PreviewRow
                label={isCommunityMode ? "Member" : "Participant"}
                value={
                  selectedUser
                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                    : "Not selected"
                }
              />

              <PreviewRow
                label="Amount"
                value={formatCurrency(amountPreview || undefined)}
              />

              {isCommunityMode ? (
                <>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                    <p className="font-semibold">What will happen?</p>
                    <p className="mt-2">
                      The system will record this money against the selected
                      member and update the fund’s savings records.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    This guided workflow prevents accidental financial mistakes.
                    If this record is wrong later, it will be corrected safely
                    instead of deleted.
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                    <p className="font-semibold">Accounting effect</p>
                    <p className="mt-2">Debit Cash / Bank</p>
                    <p>Credit Member Savings Liability</p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    This guided workflow prevents unbalanced journal entries. The
                    backend posts the journal automatically after validating the
                    cycle, participant, amount, and accounting settings.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>

      <div className="mt-2">{children}</div>

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--foreground)]">
        {value}
      </span>
    </div>
  );
}