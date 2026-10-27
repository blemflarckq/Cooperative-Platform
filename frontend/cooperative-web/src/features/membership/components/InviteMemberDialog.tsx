import { useState } from "react";
import { Copy, MessageCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGenerateInviteLink } from "../hooks/useGenerateInviteLink";

/**
 * The link is created on an explicit tap, never automatically when the
 * dialog opens — it's a real record with a real 4-hour life, so opening
 * and closing the dialog shouldn't quietly mint links nobody sent.
 *
 * Sharing is WhatsApp-first because that's where these invitations
 * actually happen, and a wa.me link needs no SMS provider or backend
 * integration at all.
 */
export function InviteMemberDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const generateLink = useGenerateInviteLink();

  const invite = generateLink.data;
  const url = invite ? `${window.location.origin}/join/${invite.token}` : null;
  const cooperativeName = user?.tenantName ?? "our cooperative";
  const whatsappHref = url
    ? `https://wa.me/?text=${encodeURIComponent(
        `You're invited to join ${cooperativeName} on Kopano. Open this link within 4 hours: ${url}`,
      )}`
    : undefined;
  const expiresAtLabel = invite
    ? new Date(invite.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) generateLink.reset();
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy automatically — press and hold the link to copy it.");
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        <Button>
          <UserPlus className="mr-1.5 size-4" />
          Invite a member
        </Button>
      </span>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-[var(--border)] bg-[var(--card)]">
          <DialogHeader>
            <DialogTitle>Invite someone</DialogTitle>
            <DialogDescription>
              Creates a link for one person. It works once and expires in 4 hours — send it
              while you're talking to them. They'll still need two of you to approve them.
            </DialogDescription>
          </DialogHeader>

          {!invite ? (
            <Button
              className="h-11 w-full"
              disabled={generateLink.isPending}
              onClick={() => generateLink.mutate()}
            >
              {generateLink.isPending ? "Creating..." : "Create invite link"}
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input readOnly value={url ?? ""} onFocus={(e) => e.currentTarget.select()} />
                <Button variant="outline" onClick={copyLink} aria-label="Copy link">
                  <Copy className="size-4" />
                </Button>
              </div>

              <Button asChild className="h-11 w-full">
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1.5 size-4" />
                  Share on WhatsApp
                </a>
              </Button>

              <p className="text-xs text-[var(--muted-foreground)]">
                Valid until {expiresAtLabel}. Works for one person only.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
