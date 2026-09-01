import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatting/currency";
import type { OutboundRequest } from "../types/approval.types";

interface OutboundRequestCardProps {
  request: OutboundRequest;
  currentUserId: string;
  onApprove: () => void;
  onDecline: () => void;
  isSubmitting: boolean;
}

/**
 * Visual pattern matches the approved "approvals queue" mockup exactly:
 * flat card, 0.5px border, no shadow, one accent-filled action, and the
 * governance constraint (can't approve your own request) stated in plain
 * language inline rather than hidden behind a disabled button with no
 * explanation.
 */
export function OutboundRequestCard({
  request,
  currentUserId,
  onApprove,
  onDecline,
  isSubmitting,
}: OutboundRequestCardProps) {
  const isOwnRequest = request.initiatedBy?.user?.id === currentUserId;
  const viewerDecision = (request.approvals ?? []).find(
    (approval) => approval.approver?.user?.id === currentUserId,
  )?.decision;
  const approvedCount = (request.approvals ?? []).filter(
    (approval) => approval.decision === "APPROVED",
  ).length;

  // NOTE: every scheme currently uses 2 required approvals by product
  // decision, so this is a safe default for display — the real source of
  // truth is each scheme's ApprovalPolicy, not fetched here yet. Worth
  // wiring through properly once policies become editable in the UI.
  const requiredApprovals = 2;

  const requesterName = request.initiatedBy?.user
    ? `${request.initiatedBy.user.firstName} ${request.initiatedBy.user.lastName}`
    : "Someone";

  return (
    <Card className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-none ring-0">
      <div className="mb-2.5 flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-[var(--foreground)]">
            {request.purpose}
          </div>
          <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {requesterName}
          </div>
        </div>
        <span className="text-lg font-medium text-[var(--foreground)]">
          {formatCurrency(request.amount)}
        </span>
      </div>

      {isOwnRequest ? (
        <div className="rounded-xl bg-[var(--secondary)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          You initiated this, you can't approve your own request.
        </div>
      ) : viewerDecision ? (
        <div
          className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs ${
            viewerDecision === "APPROVED"
              ? "bg-[var(--success)]/10 text-[var(--success)]"
              : "bg-[var(--destructive)]/10 text-[var(--destructive)]"
          }`}
        >
          <CheckCircle2 className="size-3.5 shrink-0" />
          <span>
            {viewerDecision === "APPROVED"
              ? `You approved this — ${approvedCount} of ${requiredApprovals} approvals so far.`
              : "You declined this."}
          </span>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-1.5">
            {approvedCount > 0 ? (
              <CheckCircle2 className="size-3.5 text-[var(--success)]" />
            ) : (
              <Clock className="size-3.5 text-[var(--muted-foreground)]" />
            )}
            <span className="text-xs text-[var(--muted-foreground)]">
              {approvedCount} of {requiredApprovals} approvals
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onDecline}
            >
              Decline
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={onApprove}
            >
              Approve
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
