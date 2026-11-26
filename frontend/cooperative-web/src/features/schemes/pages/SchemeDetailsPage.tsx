import { useState, type ReactNode } from "react";
import { ChevronRight, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { PageContainer } from "@/components/common/PageContainer";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatDate } from "@/lib/formatting/date";
import { useTenantNavigation } from "@/lib/navigation/useTenantNavigation";
import { cn } from "@/lib/utils/cn";

import { useCyclesByScheme } from "@/features/cycles/hooks/useCyclesByScheme";
import { SchemeRulesList } from "../components/SchemeRulesList";
import { SchemeStatusBadge } from "../components/SchemeStatusBadge";
import { useScheme } from "../hooks/useScheme";
import { useSchemeTransition } from "../hooks/useSchemeTransition";
import { useSchemeWords } from "../hooks/useSchemeWords";
import {
  describeArchiveBlockers,
  isStructureLocked,
  joinPhrases,
  SUSPEND_EFFECT,
} from "../utils/scheme-state";

const cardClass =
  "gap-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0";

/** Cycles are fetched in one go and revealed ten at a time. */
const CYCLE_FETCH = 50;
const CYCLE_PAGE = 10;

/**
 * One scheme, and what to do next with it. A single accent action at a
 * time, in the "next step" card (activate it, create its first cycle,
 * open it); the header holds only Edit. Everything that can't be done is
 * said where the action would have been, with the reason, instead of a
 * button that doesn't work.
 */
export function SchemeDetailsPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const navigate = useNavigate();
  const { navigateToApp, appPath } = useTenantNavigation();
  const { hasPermission } = useAuth();
  const words = useSchemeWords();

  const [visibleCycles, setVisibleCycles] = useState(CYCLE_PAGE);

  const schemeQuery = useScheme(schemeId!);
  const cyclesQuery = useCyclesByScheme(schemeId!, { page: 1, limit: CYCLE_FETCH });
  const transition = useSchemeTransition();

  if (schemeQuery.isLoading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (schemeQuery.isError || !schemeQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title={`Could not load this ${words.noun}`}
          description="It may have been removed, or the connection dropped. Go back and try again."
        />
      </PageContainer>
    );
  }

  const scheme = schemeQuery.data;
  const cycles = cyclesQuery.data?.data ?? [];
  const cycleTotal = cyclesQuery.data?.meta.total ?? cycles.length;
  const hasOpenCycle = cycles.some((cycle) => cycle.status === "OPEN");
  const latestCycle = cycles[0];

  const isDraft = scheme.status === "DRAFT";
  const isActive = scheme.status === "ACTIVE";
  const isSuspended = scheme.status === "SUSPENDED";
  const isArchived = scheme.status === "ARCHIVED";
  const offersLoans = scheme.loanMode !== "DISABLED";

  const mayEdit = hasPermission(["scheme:update"]) && !isArchived;
  const mayActivate = hasPermission(["scheme:activate"]);
  const maySuspend = hasPermission(["scheme:suspend"]);
  const mayArchive = hasPermission(["scheme:archive"]);
  const mayCreateCycle = hasPermission(["cycle:create"]);

  const blockerPhrases = describeArchiveBlockers(scheme.archiveBlockers);
  const quote = `"${scheme.name}"`;

  const links = [
    offersLoans && hasPermission(["loan:read"])
      ? { to: `/schemes/${scheme.id}/loans`, label: "Loans", hint: "Requests and repayments" }
      : null,
    offersLoans && hasPermission(["loan-policy:read"])
      ? { to: `/schemes/${scheme.id}/loan-policy`, label: "Loan terms", hint: "Interest and limits" }
      : null,
    // Approvals are for money going out of an active scheme; a draft has none.
    !isDraft && hasPermission(["outbound-request:approve"])
      ? {
          to: `/schemes/${scheme.id}/approvals`,
          label: words.isCommunityMode ? "Waiting on you" : "Approvals",
          hint: "Money going out that needs sign-off",
        }
      : null,
  ].filter((link): link is { to: string; label: string; hint: string } => link !== null);

  const nextStep = resolveNextStep();

  function resolveNextStep(): {
    title: string;
    description: string;
    action?: ReactNode;
  } | null {
    if (isArchived) {
      return {
        title: `This ${words.noun} is archived`,
        description:
          "Archived is closed for good. It takes no new activity and can't be changed, and its history is kept.",
      };
    }

    if (isDraft) {
      return {
        title: `Activate this ${words.noun} to start using it`,
        description: `Until it's active you can't create ${words.cycles} or record any money. You can still change its rules before you activate it.`,
        action: mayActivate ? (
          <Button
            disabled={transition.isPending}
            onClick={() => transition.mutate({ schemeId: scheme.id, transition: "activate" })}
          >
            {transition.isPending ? "Activating…" : "Activate"}
          </Button>
        ) : null,
      };
    }

    if (isSuspended) {
      return {
        title: `This ${words.noun} is suspended`,
        description: `It isn't taking new contributions, loan requests or members. Repayments and loans already approved carry on.`,
        action: mayActivate ? (
          <Button
            disabled={transition.isPending}
            onClick={() => transition.mutate({ schemeId: scheme.id, transition: "resume" })}
          >
            {transition.isPending ? "Resuming…" : "Resume"}
          </Button>
        ) : null,
      };
    }

    if (cyclesQuery.isLoading || cyclesQuery.isError) return null;

    if (cycleTotal === 0) {
      return {
        title: `Create the first ${words.cycle}`,
        description: `A ${words.cycle} is what members join and contribute to. Nothing can be recorded until there is one.`,
        action: mayCreateCycle ? (
          <Button onClick={() => navigateToApp(`/schemes/${scheme.id}/cycles/new`)}>
            New {words.cycle}
          </Button>
        ) : null,
      };
    }

    if (!hasOpenCycle && latestCycle) {
      return {
        title: `${latestCycle.name} isn't open`,
        description: `Open it so members can contribute.`,
        action: (
          <Button onClick={() => navigateToApp(`/cycles/${latestCycle.id}`)}>
            Go to {words.cycle}
          </Button>
        ),
      };
    }

    return null;
  }

  const showStatusCard = !isArchived && ((isActive && maySuspend) || mayArchive);

  return (
    <PageContainer>
      <PageHeader
        title={scheme.name}
        backTo={appPath("/schemes")}
        backLabel={words.Plural}
        actions={
          mayEdit ? (
            <Button variant="outline" onClick={() => navigateToApp(`/schemes/${scheme.id}/edit`)}>
              <Pencil className="mr-1.5 size-4" />
              Edit
            </Button>
          ) : null
        }
      />

      <Card className={cardClass}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-medium">About it</h2>
          <SchemeStatusBadge status={scheme.status} />
        </div>
        <p
          className={cn(
            "mt-2 text-sm leading-6",
            scheme.description ? "" : "text-[var(--muted-foreground)]",
          )}
        >
          {scheme.description || "No description yet"}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <Fact label="Code" value={scheme.code} />
          <Fact
            label={scheme.activatedAt ? "Active since" : "Created"}
            value={formatDate(scheme.activatedAt ?? scheme.createdAt)}
          />
        </dl>
      </Card>

      {nextStep ? (
        <Card className={cardClass}>
          <h2 className="text-sm font-medium">{nextStep.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{nextStep.description}</p>
          {nextStep.action ? <div className="mt-3">{nextStep.action}</div> : null}
          {nextStep.action === null ? (
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              {isDraft || isSuspended
                ? "An administrator or treasurer can do this."
                : `Someone with permission to manage ${words.cycles} can do this.`}
            </p>
          ) : null}
        </Card>
      ) : null}

      <Card className={cardClass}>
        <h2 className="text-sm font-medium">How it works</h2>
        <div className="mt-3">
          <SchemeRulesList values={scheme} />
        </div>
        {isStructureLocked(scheme.status) ? (
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-5 text-[var(--muted-foreground)]">
            Fixed once a {words.noun} is activated, because its {words.cycles}, contributions and
            loans are built on these. The name and description can still change.
          </p>
        ) : null}
      </Card>

      {links.length > 0 ? (
        <Card className={cn(cardClass, "p-0")}>
          {links.map((link, index) => (
            <button
              key={link.to}
              type="button"
              onClick={() => navigate(appPath(link.to))}
              className={cn(
                "flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--secondary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/20",
                index === 0 ? "rounded-t-2xl" : "border-t border-[var(--border)]",
                index === links.length - 1 ? "rounded-b-2xl" : "",
              )}
            >
              <div>
                <div className="text-sm font-medium">{link.label}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{link.hint}</div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-[var(--muted-foreground)]" />
            </button>
          ))}
        </Card>
      ) : null}

      <Card className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">{words.Cycles}</h2>
          {isActive && mayCreateCycle && cycleTotal > 0 ? (
            <Button variant="outline" onClick={() => navigateToApp(`/schemes/${scheme.id}/cycles/new`)}>
              New {words.cycle}
            </Button>
          ) : null}
        </div>

        {cyclesQuery.isLoading ? (
          <div className="mt-3">
            <LoadingState />
          </div>
        ) : cyclesQuery.isError ? (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Could not load the {words.cycles}. Reload the page to try again.
          </p>
        ) : cycles.length === 0 ? (
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            None yet.{" "}
            {isActive
              ? `Members join and contribute through a ${words.cycle}.`
              : `${words.Cycles} can be created once the ${words.noun} is active.`}
          </p>
        ) : (
          <>
            <ul className="mt-2 divide-y divide-[var(--border)]">
              {cycles.slice(0, visibleCycles).map((cycle) => (
                <li key={cycle.id}>
                  <button
                    type="button"
                    onClick={() => navigate(appPath(`/cycles/${cycle.id}`))}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/20"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{cycle.name}</div>
                      {cycle.startsOn || cycle.endsOn ? (
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {[cycle.startsOn, cycle.endsOn]
                            .map((date) => (date ? formatDate(date) : "open"))
                            .join(" – ")}
                        </div>
                      ) : null}
                    </div>
                    <StatusBadge status={cycle.status} />
                  </button>
                </li>
              ))}
            </ul>
            {cycles.length > visibleCycles ? (
              <div className="mt-2">
                <Button variant="ghost" onClick={() => setVisibleCycles((count) => count + CYCLE_PAGE)}>
                  Show more
                </Button>
              </div>
            ) : null}
            {cycleTotal > cycles.length ? (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Showing the latest {cycles.length} of {cycleTotal}.
              </p>
            ) : null}
          </>
        )}
      </Card>

      {showStatusCard ? (
        <Card className={cardClass}>
          <h2 className="text-sm font-medium">Status</h2>

          {isActive && maySuspend ? (
            <div className="mt-2">
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                {SUSPEND_EFFECT} You can resume it at any time.
              </p>
              <div className="mt-3">
                <ConfirmActionDialog
                  trigger={
                    <Button variant="outline" disabled={transition.isPending}>
                      Suspend {words.noun}
                    </Button>
                  }
                  title={`Suspend ${quote}?`}
                  description={`${SUSPEND_EFFECT} You can resume it at any time.`}
                  confirmLabel="Suspend"
                  loadingLabel="Suspending…"
                  isLoading={transition.isPending}
                  onConfirm={() => transition.mutate({ schemeId: scheme.id, transition: "suspend" })}
                />
              </div>
            </div>
          ) : null}

          {mayArchive ? (
            <div className={cn(isActive && maySuspend ? "mt-4 border-t border-[var(--border)] pt-4" : "mt-2")}>
              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                Archiving closes it for good. It takes no new activity and can't be reopened, and its
                history is kept.
              </p>
              <div className="mt-3">
                {blockerPhrases.length > 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Can't be archived yet: {joinPhrases(blockerPhrases)}. Close the {words.cycles} and settle
                    the loans first.
                  </p>
                ) : (
                  <ConfirmActionDialog
                    trigger={
                      <Button
                        variant="outline"
                        className="text-[var(--destructive)]"
                        disabled={transition.isPending}
                      >
                        Archive {words.noun}
                      </Button>
                    }
                    title={`Archive ${quote}?`}
                    description="It will take no new activity, can't be reopened, and can't be edited. Its history is kept exactly as it is."
                    confirmLabel="Archive"
                    loadingLabel="Archiving…"
                    variant="destructive"
                    isLoading={transition.isPending}
                    onConfirm={() => transition.mutate({ schemeId: scheme.id, transition: "archive" })}
                  />
                )}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </PageContainer>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}
