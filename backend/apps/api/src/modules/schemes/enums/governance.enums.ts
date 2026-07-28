/**
 * Governance role a user can hold within a specific scheme (group).
 * Deliberately separate from the platform-wide Role/TenantUserRole system
 * (see identity module) — this answers "what governance position does this
 * person hold in this specific group," not "what can they generally do in
 * the platform." Extensible: add new values here as new governance
 * patterns come up (e.g. SECRETARY, CHAIRPERSON).
 */
export enum SchemeGovernanceRoleType {
  TREASURER = "TREASURER",
  COMMITTEE_MEMBER = "COMMITTEE_MEMBER",
  AUDITOR = "AUDITOR",
}

/**
 * A pending or resolved decision by one approver on an OutboundRequest.
 */
export enum ApprovalDecision {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

/**
 * Lifecycle of a single outbound money movement request. Every withdrawal
 * from a scheme's pooled funds — loan disbursement, project expense,
 * anything — moves through this same lifecycle.
 */
export enum OutboundRequestStatus {
  INITIATED = "INITIATED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  EXECUTED = "EXECUTED",
}

/**
 * What kind of outbound movement this request represents. Extensible as
 * new scheme purposes (community projects, crowdfunding) get their own
 * request types.
 */
export enum OutboundRequestType {
  LOAN_DISBURSEMENT = "LOAN_DISBURSEMENT",
  PROJECT_EXPENSE = "PROJECT_EXPENSE",
  GENERAL_WITHDRAWAL = "GENERAL_WITHDRAWAL",
}

export enum RoleTransitionPetitionStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
}
