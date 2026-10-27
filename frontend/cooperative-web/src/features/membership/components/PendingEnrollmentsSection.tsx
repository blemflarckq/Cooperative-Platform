import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { usePendingEnrollments } from "../hooks/usePendingEnrollments";
import { useRecordEnrollmentDecision } from "../hooks/useRecordEnrollmentDecision";
import type { PendingEnrollment } from "../types/membership.types";

/**
 * Renders nothing when there's nothing waiting — an empty "0 pending"
 * panel on every visit is noise, and the people who can see this at all
 * (admin, treasurer) mostly come here for the members list, not the
 * queue. Parent gates this by permission; the endpoint itself also
 * refuses anyone who isn't an approver.
 */
export function PendingEnrollmentsSection() {
  const pendingQuery = usePendingEnrollments();
  const pending = pendingQuery.data ?? [];

  if (pending.length === 0) return null;

  return (
    <section>
      <div className="mb-2 text-xs text-[var(--muted-foreground)]">
        Waiting for approval ({pending.length})
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {pending.map((enrollment) => (
          <PendingEnrollmentCard key={enrollment.id} enrollment={enrollment} />
        ))}
      </div>
    </section>
  );
}

function describeWindow(expiresAt: string, approvedCount: number): string {
  const msLeft = new Date(expiresAt).getTime() - Date.now();

  if (msLeft <= 0) {
    return approvedCount > 0 ? "Invite window passed — kept because it has an approval" : "Expired";
  }

  const minutes = Math.ceil(msLeft / 60000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m left` : `${minutes}m left`;
}

function PendingEnrollmentCard({ enrollment }: { enrollment: PendingEnrollment }) {
  const decide = useRecordEnrollmentDecision();
  const approvedCount = enrollment.approvals.filter((a) => a.decision === "APPROVED").length;

  return (
    <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{enrollment.applicant.fullName}</div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {enrollment.applicant.mobileMasked ?? "No phone number"}
          </div>
          {enrollment.applicant.email && (
            <div className="truncate text-xs text-[var(--muted-foreground)]">
              {enrollment.applicant.email}
            </div>
          )}
        </div>
        <StatusBadge status="PENDING_APPROVAL" />
      </div>

      <div className="mt-2.5 text-xs text-[var(--muted-foreground)]">
        {approvedCount} of {enrollment.requiredApprovals} approvals
        {enrollment.approvals.length > 0 &&
          ` · ${enrollment.approvals.map((a) => a.approverName).join(", ")}`}
        {" · "}
        {describeWindow(enrollment.expiresAt, approvedCount)}
      </div>

      <div className="mt-3">
        {enrollment.viewerHasDecided ? (
          <div className="text-xs text-[var(--muted-foreground)]">
            You've decided — waiting for the other approver.
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={decide.isPending}
              onClick={() => decide.mutate({ enrollmentId: enrollment.id, decision: "APPROVED" })}
            >
              <Check className="mr-1 size-4" />
              Approve
            </Button>
            <ConfirmActionDialog
              trigger={
                <Button size="sm" variant="outline" className="flex-1" disabled={decide.isPending}>
                  <X className="mr-1 size-4" />
                  Decline
                </Button>
              }
              title={`Decline ${enrollment.applicant.fullName}?`}
              description="A single decline ends this request — it can't be undone. They'd need a new invite link to try again."
              confirmLabel="Decline"
              variant="destructive"
              isLoading={decide.isPending}
              onConfirm={() =>
                decide.mutate({ enrollmentId: enrollment.id, decision: "REJECTED" })
              }
            />
          </div>
        )}
      </div>
    </Card>
  );
}
