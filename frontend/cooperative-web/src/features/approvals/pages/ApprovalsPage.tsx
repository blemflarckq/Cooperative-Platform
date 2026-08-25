import { ClipboardCheck } from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useAuth } from "@/lib/auth/AuthContext";
import { useExperienceMode } from "@/lib/experience/useExperienceMode";

import { OutboundRequestCard } from "../components/OutboundRequestCard";
import { useRecordApproval } from "../hooks/useRecordApproval";
import { useSchemeOutboundRequests } from "../hooks/useSchemeOutboundRequests";

export function ApprovalsPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const { user } = useAuth();
  const { isCommunityMode } = useExperienceMode();
  const recordApproval = useRecordApproval();

  const requestsQuery = useSchemeOutboundRequests(schemeId ?? "");

  const pageTitle = isCommunityMode ? "Waiting on you" : "Approvals";
  const pageDescription = isCommunityMode
    ? "Requests that need your decision before money can move."
    : "Outbound requests awaiting the required approvals for this scheme.";

  if (!schemeId) return <ErrorState title="No scheme selected" />;
  if (requestsQuery.isLoading) return <LoadingState />;

  if (requestsQuery.isError) {
    return (
      <ErrorState
        title={
          isCommunityMode ? "Could not load your approvals" : "Could not load approvals"
        }
      />
    );
  }

  const requests = (requestsQuery.data ?? []).filter(
    (request) => request.status === "INITIATED",
  );

  function handleDecision(requestId: string, decision: "APPROVED" | "REJECTED") {
    if (!schemeId) return;

    recordApproval.mutate(
      { schemeId, requestId, decision },
      {
        onSuccess: async () => {
          toast.success(
            decision === "APPROVED" ? "Approval recorded" : "Request declined",
          );
          // Explicit refetch in addition to the hook's own cache
          // invalidation — belt-and-braces so the card's approval count
          // (or its disappearance once fully decided) is never stale.
          await requestsQuery.refetch();
        },
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Something went wrong.";
          toast.error(message);
        },
      },
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <PageHeader title={pageTitle} description={pageDescription} />

      {requests.length === 0 ? (
        <EmptyState
          title={isCommunityMode ? "Nothing waiting on you" : "No pending requests"}
          description={
            isCommunityMode
              ? "When someone in your group needs money released, it will show up here for you to decide on."
              : "Outbound requests requiring your approval will appear here."
          }
          icon={<ClipboardCheck className="size-5" />}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((request) => (
            <OutboundRequestCard
              key={request.id}
              request={request}
              currentUserId={user?.id ?? ""}
              isSubmitting={recordApproval.isPending}
              onApprove={() => handleDecision(request.id, "APPROVED")}
              onDecline={() => handleDecision(request.id, "REJECTED")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
