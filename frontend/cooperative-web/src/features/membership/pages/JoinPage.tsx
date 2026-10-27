import { useEffect, useState } from "react";
import { CheckCircle2, Landmark, XCircle } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAcceptInvite } from "../hooks/useAcceptInvite";
import { useInvitePreview } from "../hooks/useInvitePreview";
import { clearPendingInvite, rememberPendingInvite } from "../lib/pending-invite";

const INVALID_COPY: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This invite has expired",
    body: "Invites only last 4 hours. Ask the admin or treasurer who invited you for a new link.",
  },
  already_used: {
    title: "This invite has already been used",
    body: "Each invite works for one person. Ask the admin or treasurer for a new link.",
  },
  not_found: {
    title: "We couldn't find this invite",
    body: "Check the link, or ask the admin or treasurer to send you a new one.",
  },
};

/**
 * Where an invite link lands. Public on purpose — the person is usually
 * not signed in, and often has no account at all yet. Signing in or
 * registering is sent off from here and the invite is remembered in
 * sessionStorage so it survives that trip (including the Google/Facebook
 * round trip, which wipes router state). Whoever completes the detour
 * either lands back here already signed in, or — for someone who
 * belongs to no cooperative yet — has the request submitted for them
 * and arrives here already showing the "request sent" screen.
 */
export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const previewQuery = useInvitePreview(token);
  const acceptInvite = useAcceptInvite();

  const [submittedTenantName, setSubmittedTenantName] = useState<string | null>(
    (location.state as { submittedTenantName?: string } | null)?.submittedTenantName ?? null,
  );

  const preview = previewQuery.data;
  const isInvalid = Boolean(preview) && !preview?.valid;

  // A dead invite must not linger in storage and hijack a later sign-in.
  useEffect(() => {
    if (isInvalid) clearPendingInvite();
  }, [isInvalid]);

  function goToAuth(path: "/login" | "/register") {
    if (!token) return;
    rememberPendingInvite(token);
    navigate(path);
  }

  function requestToJoin() {
    if (!token) return;
    acceptInvite.mutate(token, {
      onSuccess: (result) => {
        clearPendingInvite();
        setSubmittedTenantName(result.tenantName);
      },
    });
  }

  if (submittedTenantName) {
    return (
      <StatusCard
        icon={<CheckCircle2 className="size-6" />}
        title="Request sent"
        body={`The admin and treasurer of ${submittedTenantName} will review it. Once two of them approve, you're a member — sign in and ${submittedTenantName} will be there. If nobody gets to it in time, ask them for a new link.`}
        action={
          isAuthenticated ? (
            <Button asChild className="w-full">
              <Link to="/app/dashboard">Back to your dashboard</Link>
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link to="/login">Go to sign in</Link>
            </Button>
          )
        }
      />
    );
  }

  if (previewQuery.isLoading || isBootstrapping) return <LoadingState />;

  if (previewQuery.isError || !token || !preview) {
    return (
      <StatusCard
        icon={<XCircle className="size-6" />}
        title="Couldn't check this invite"
        body="Something went wrong on our side. Please try the link again in a moment."
      />
    );
  }

  if (!preview.valid) {
    const copy = INVALID_COPY[preview.reason ?? "not_found"] ?? INVALID_COPY.not_found;
    return <StatusCard icon={<XCircle className="size-6" />} title={copy.title} body={copy.body} />;
  }

  return (
    <StatusCard
      icon={<Landmark className="size-6" />}
      title={`Join ${preview.tenantName ?? "this cooperative"}`}
      body={
        isAuthenticated
          ? "You've been invited. Send your request and two of their admins will review it."
          : "You've been invited. Sign in or create an account to send your request — two of their admins will review it."
      }
      action={
        isAuthenticated ? (
          <Button className="h-11 w-full" disabled={acceptInvite.isPending} onClick={requestToJoin}>
            {acceptInvite.isPending ? "Sending..." : "Request to join"}
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Button className="h-11 w-full" onClick={() => goToAuth("/register")}>
              Create an account
            </Button>
            <Button variant="outline" className="h-11 w-full" onClick={() => goToAuth("/login")}>
              I already have an account
            </Button>
          </div>
        )
      }
    />
  );
}

function StatusCard({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-(--border) bg-white shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-(--primary) text-white shadow-sm">
            {icon}
          </div>
        </div>
        <div className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
          <p className="mt-2 text-sm text-(--muted-foreground)">{body}</p>
        </div>
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  );
}
