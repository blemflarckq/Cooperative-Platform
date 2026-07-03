import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/api-error";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";

import { useReverseContribution } from "../hooks/useReverseContribution";
import { type Contribution } from "../types/contribution.types";

interface ReverseContributionDialogProps {
  contribution: Contribution;
}

export function ReverseContributionDialog({
  contribution,
}: ReverseContributionDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { isCommunityMode } = useExperienceMode();
  const mutation = useReverseContribution();

  const isAlreadyReversed = contribution.status === "REVERSED";

  const triggerLabel = isCommunityMode ? "Correct" : "Reverse";
  const dialogTitle = isCommunityMode
    ? "Correct this money record?"
    : "Reverse contribution?";

  const dialogDescription = isCommunityMode
    ? "This creates a proper correction record and marks the money received as corrected. Use this for duplicate receipts, wrong amounts, wrong members, or other recording mistakes."
    : "This will post a reversing journal entry and mark the contribution as reversed. Use this only for corrections such as duplicate or incorrect receipts.";

  const reasonLabel = isCommunityMode ? "Correction reason" : "Reversal reason";
  const reasonPlaceholder = isCommunityMode
    ? "Example: Duplicate receipt or wrong amount"
    : "Example: Duplicate receipt";

  const confirmLabel = isCommunityMode
    ? "Correct Money Record"
    : "Reverse Contribution";

  const loadingLabel = isCommunityMode ? "Correcting..." : "Reversing...";

  function handleReverse() {
    mutation.mutate(
      {
        contributionId: contribution.id,
        cycleId: contribution.cycleId,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          toast.success(
            isCommunityMode
              ? "Money record corrected"
              : "Contribution reversed",
          );
          setOpen(false);
          setReason("");
        },
        onError: (error) => toast.error(getApiErrorMessage(error)),
      },
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={isAlreadyReversed}
        onClick={() => setOpen(true)}
        className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60"
      >
        <RotateCcw className="mr-2 size-4" />
        {isAlreadyReversed
          ? isCommunityMode
            ? "Corrected"
            : "Reversed"
          : triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--card)]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium text-[var(--foreground)]">
              {reasonLabel}
            </label>

            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={reasonPlaceholder}
              className="mt-2"
            />

            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {isCommunityMode
                ? "The original record is not deleted. The system keeps a clear audit trail by creating a correction."
                : "The original contribution is not deleted. A reversal is posted for auditability."}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={mutation.isPending || reason.trim().length < 3}
              onClick={handleReverse}
            >
              {mutation.isPending ? loadingLabel : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}