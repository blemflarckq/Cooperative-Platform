import { apiClient } from "@/lib/api/api-client";
import type {
  OutboundRequest,
  RecordOutboundApprovalRequest,
} from "../types/approval.types";

export async function getOutboundRequestsForScheme(
  schemeId: string,
): Promise<OutboundRequest[]> {
  const response = await apiClient.get<OutboundRequest[]>(
    `/schemes/${schemeId}/outbound-requests`,
  );
  return response.data;
}

export async function getOutboundRequest(
  schemeId: string,
  requestId: string,
): Promise<OutboundRequest> {
  const response = await apiClient.get<OutboundRequest>(
    `/schemes/${schemeId}/outbound-requests/${requestId}`,
  );
  return response.data;
}

export async function recordOutboundApproval(
  schemeId: string,
  requestId: string,
  payload: RecordOutboundApprovalRequest,
): Promise<OutboundRequest> {
  const response = await apiClient.post<OutboundRequest>(
    `/schemes/${schemeId}/outbound-requests/${requestId}/approvals`,
    payload,
  );
  return response.data;
}
