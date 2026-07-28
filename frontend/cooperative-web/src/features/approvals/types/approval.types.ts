export type OutboundRequestStatus = "INITIATED" | "APPROVED" | "REJECTED" | "EXECUTED";

export type OutboundRequestType =
  | "LOAN_DISBURSEMENT"
  | "PROJECT_EXPENSE"
  | "GENERAL_WITHDRAWAL";

export type ApprovalDecision = "APPROVED" | "REJECTED";

export interface ApproverSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface OutboundRequestApproval {
  id: string;
  outboundRequestId: string;
  approverTenantUserId: string;
  decision: ApprovalDecision;
  comment: string | null;
  decidedAt: string;
  createdAt: string;
  updatedAt: string;
  approver?: {
    id: string;
    user: ApproverSummary | null;
  };
}

export interface OutboundRequest {
  id: string;
  tenantId: string;
  schemeId: string;
  requestType: OutboundRequestType;
  amount: string;
  purpose: string;
  status: OutboundRequestStatus;
  initiatedByTenantUserId: string;
  sourceReference: string | null;
  executedJournalEntryId: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
  approvals?: OutboundRequestApproval[];
  initiatedBy?: {
    id: string;
    user: ApproverSummary | null;
  };
}

export interface RecordOutboundApprovalRequest {
  decision: ApprovalDecision;
  comment?: string;
}
