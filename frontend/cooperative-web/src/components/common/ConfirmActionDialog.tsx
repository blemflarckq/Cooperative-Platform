import { type ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmActionDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  loadingLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ConfirmActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  loadingLabel = "Working...",
  variant = "default",
  onConfirm,
  disabled,
  isLoading,
}: ConfirmActionDialogProps) {
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    onConfirm();
    setOpen(false);
  }

  return (
    <>
      <span onClick={() => !disabled && setOpen(true)}>{trigger}</span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[var(--border)] bg-[var(--card)]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button variant={variant} onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? loadingLabel : confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}