import { useState } from "react";
import { useParams } from "react-router";

import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthContext";
import { useScheme } from "@/features/schemes/hooks/useScheme";
import { useLoanPolicy } from "../hooks/useLoanPolicy";
import { useUpsertLoanPolicy } from "../hooks/useUpsertLoanPolicy";
import type { AtCapBehavior } from "../types/loan.types";
import type {
  LoanPolicy,
  RateScheduleMode,
  UpsertLoanPolicyRequest,
} from "../types/loan-policy.types";

/**
 * The treasurer's loan terms for one scheme. Rates are monthly
 * percentages. Peer-funded money can follow one of two shapes — a rate
 * that climbs every month, or three fixed stages by loan age — and each
 * scheme picks one. The self-funded part is always one fixed rate.
 *
 * Everything on this screen applies to loans created AFTER saving; a
 * loan keeps the terms it was issued with, and the page says so.
 */
export function LoanPolicyPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const schemeQuery = useScheme(schemeId ?? "");
  const policyQuery = useLoanPolicy(schemeId);

  if (policyQuery.isLoading) return <LoadingState />;

  if (policyQuery.isError || !policyQuery.data || !schemeId) {
    return (
      <PageContainer>
        <PageHeader title="Loan terms" backTo={schemeId ? `/schemes/${schemeId}` : "/schemes"} />
        <ErrorState
          title="No loan terms yet"
          description="Loan terms are created when the scheme is activated."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Loan terms"
        description={schemeQuery.data?.name}
        backTo={`/schemes/${schemeId}`}
      />
      {/* Re-keyed on the server's last-saved time so the form always
          starts from what was actually saved, never stale local state. */}
      <LoanPolicyForm key={policyQuery.data.updatedAt} schemeId={schemeId} policy={policyQuery.data} />
    </PageContainer>
  );
}

interface FormState {
  mode: RateScheduleMode;
  selfRate: string;
  baseRate: string; // RAMP: starting rate · PERIODS: initial rate
  increment: string; // RAMP only
  capRate: string; // RAMP: ceiling · PERIODS: cut-off rate
  laterRate: string; // PERIODS only
  initialMonths: string;
  laterMonths: string;
  atCap: AtCapBehavior;
}

function toFormState(policy: LoanPolicy): FormState {
  return {
    mode: policy.rateScheduleMode,
    selfRate: policy.selfFundedMonthlyRate,
    baseRate: policy.peerBaseMonthlyRate,
    increment: policy.peerMonthlyRateIncrement,
    capRate: policy.peerCapRate,
    laterRate: policy.peerLaterMonthlyRate ?? "",
    initialMonths: policy.initialPeriodMonths?.toString() ?? "",
    laterMonths: policy.laterPeriodMonths?.toString() ?? "",
    atCap: policy.atCapBehavior,
  };
}

const num = (value: string) => (value.trim() === "" ? NaN : Number(value));
const rate = (value: string) => Number(value).toString();

/** Mirrors the server's rules so a mistake is caught before saving; the server still has the final say. */
function findProblem(f: FormState): string | null {
  const rates: Array<[string, string]> = [
    ["The own-money rate", f.selfRate],
    [f.mode === "RAMP" ? "The starting rate" : "The initial rate", f.baseRate],
    [f.mode === "RAMP" ? "The ceiling" : "The cut-off rate", f.capRate],
  ];
  if (f.mode === "RAMP") rates.push(["The monthly increase", f.increment]);
  if (f.mode === "PERIODS") rates.push(["The later rate", f.laterRate]);

  for (const [label, value] of rates) {
    if (Number.isNaN(num(value)) || num(value) < 0) return `${label} must be a number, zero or more.`;
  }

  if (num(f.baseRate) > num(f.capRate)) {
    return f.mode === "RAMP"
      ? "The starting rate can't be higher than the ceiling."
      : "The initial rate can't be higher than the cut-off rate.";
  }

  if (f.mode === "PERIODS") {
    for (const [label, value] of [
      ["The initial period", f.initialMonths],
      ["The later period", f.laterMonths],
    ]) {
      if (!Number.isInteger(num(value)) || num(value) < 1) return `${label} must be a whole number of months, at least 1.`;
    }
    if (num(f.laterRate) < num(f.baseRate) || num(f.laterRate) > num(f.capRate)) {
      return "Rates should rise as a loan ages: initial, then later, then cut-off — each at least as high as the one before.";
    }
  }

  return null;
}

/** The schedule in plain words — what a member would actually be told. */
function describe(f: FormState): string {
  if (f.mode === "RAMP") {
    return `Starts at ${rate(f.baseRate)}% a month, goes up ${rate(f.increment)}% each month, and stops rising at ${rate(f.capRate)}%.`;
  }
  const initial = num(f.initialMonths);
  const later = num(f.laterMonths);
  return `Months 1–${initial}: ${rate(f.baseRate)}% a month. Months ${initial + 1}–${initial + later}: ${rate(f.laterRate)}%. From month ${initial + later + 1}: ${rate(f.capRate)}%.`;
}

function toRequest(f: FormState): UpsertLoanPolicyRequest {
  const fixed = (value: string) => Number(value).toFixed(2);
  const shared = {
    selfFundedMonthlyRate: fixed(f.selfRate),
    peerBaseMonthlyRate: fixed(f.baseRate),
    peerCapRate: fixed(f.capRate),
    atCapBehavior: f.atCap,
  };

  if (f.mode === "RAMP") {
    return { ...shared, rateScheduleMode: "RAMP", peerMonthlyRateIncrement: fixed(f.increment) };
  }

  return {
    ...shared,
    rateScheduleMode: "PERIODS",
    peerMonthlyRateIncrement: "0.00", // unused in this mode
    initialPeriodMonths: Number(f.initialMonths),
    laterPeriodMonths: Number(f.laterMonths),
    peerLaterMonthlyRate: fixed(f.laterRate),
  };
}

function LoanPolicyForm({ schemeId, policy }: { schemeId: string; policy: LoanPolicy }) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission(["loan-policy:manage"]);
  const upsert = useUpsertLoanPolicy(schemeId);
  const [form, setForm] = useState<FormState>(() => toFormState(policy));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const problem = findProblem(form);
  const isRamp = form.mode === "RAMP";

  return (
    <div className="flex flex-col gap-4">
      {!policy.isReviewed && (
        <Card className="rounded-2xl border-0 bg-[var(--secondary)] p-3.5 text-sm shadow-none ring-0">
          These are placeholder terms. Nobody can request a loan from this scheme until a
          treasurer saves real ones.
        </Card>
      )}

      <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <SectionTitle>The borrower's own money</SectionTitle>
        <RateField
          label="Monthly rate"
          hint="Charged on the part of a loan covered by the borrower's own savings. One fixed rate — it never changes."
          value={form.selfRate}
          onChange={(v) => set("selfRate", v)}
          disabled={!canEdit}
        />
      </Card>

      <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <SectionTitle>Money from other members</SectionTitle>

        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <ModeCard
            selected={isRamp}
            disabled={!canEdit}
            title="Rises every month"
            body="Starts low and goes up by a set amount each month, until it reaches a ceiling."
            onClick={() => set("mode", "RAMP")}
          />
          <ModeCard
            selected={!isRamp}
            disabled={!canEdit}
            title="Three stages"
            body="One rate for the first months, a higher one for the next, then a final rate."
            onClick={() => set("mode", "PERIODS")}
          />
        </div>

        {isRamp ? (
          <div className="grid gap-3 md:grid-cols-3">
            <RateField label="Starting rate" value={form.baseRate} onChange={(v) => set("baseRate", v)} disabled={!canEdit} />
            <RateField label="Increase each month" value={form.increment} onChange={(v) => set("increment", v)} disabled={!canEdit} />
            <RateField label="Ceiling" value={form.capRate} onChange={(v) => set("capRate", v)} disabled={!canEdit} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <MonthsField label="Initial period" value={form.initialMonths} onChange={(v) => set("initialMonths", v)} disabled={!canEdit} />
              <RateField label="Rate" value={form.baseRate} onChange={(v) => set("baseRate", v)} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MonthsField label="Later period" value={form.laterMonths} onChange={(v) => set("laterMonths", v)} disabled={!canEdit} />
              <RateField label="Rate" value={form.laterRate} onChange={(v) => set("laterRate", v)} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-end text-xs text-[var(--muted-foreground)]">
                After that — the cut-off
              </div>
              <RateField label="Rate" value={form.capRate} onChange={(v) => set("capRate", v)} disabled={!canEdit} />
            </div>
          </div>
        )}

        <div className="mt-3 rounded-xl bg-[var(--secondary)] p-3 text-sm">
          {problem ? <span className="text-[var(--destructive)]">{problem}</span> : describe(form)}
        </div>
      </Card>

      <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
        <SectionTitle>{isRamp ? "When the rate reaches the ceiling" : "Once the cut-off is reached"}</SectionTitle>
        <div className="flex flex-col gap-2">
          <ChoiceRow
            selected={form.atCap === "CONTINUE_AT_CAP"}
            disabled={!canEdit}
            title="Keep charging the final rate"
            onClick={() => set("atCap", "CONTINUE_AT_CAP")}
          />
          <ChoiceRow
            selected={form.atCap === "FLAG_AND_BLOCK"}
            disabled={!canEdit}
            title="Mark the loan at risk and stop that borrower taking new loans"
            onClick={() => set("atCap", "FLAG_AND_BLOCK")}
          />
        </div>
      </Card>

      <p className="text-xs text-[var(--muted-foreground)]">
        Changes apply to new loans only. A loan keeps the terms it was issued with, so saving
        here never changes what someone has already agreed to.
      </p>

      {canEdit && (
        <Button
          className="h-12 w-full"
          disabled={Boolean(problem) || upsert.isPending}
          onClick={() => upsert.mutate(toRequest(form))}
        >
          {upsert.isPending ? "Saving..." : "Save loan terms"}
        </Button>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 text-sm font-medium">{children}</div>;
}

function RateField({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--muted-foreground)]">{label} (% a month)</label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      {hint && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  );
}

function MonthsField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--muted-foreground)]">{label} (months)</label>
      <Input inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

function ModeCard({
  selected,
  disabled,
  title,
  body,
  onClick,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition disabled:opacity-60 ${
        selected ? "border-[var(--primary)] bg-[var(--secondary)]" : "border-[var(--border)]"
      }`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{body}</div>
    </button>
  );
}

function ChoiceRow({
  selected,
  disabled,
  title,
  onClick,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-60 ${
        selected ? "border-[var(--primary)] bg-[var(--secondary)]" : "border-[var(--border)]"
      }`}
    >
      {title}
    </button>
  );
}
