export enum MembershipEnrollmentStatus {
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  /**
   * Got one approval but never the second within the allowed time. Kept
   * (not deleted) so there's a record of who approved what — a request
   * with no approvals at all is simply removed, since nobody vouched
   * for it. An expired applicant can start over with a new invite link.
   */
  EXPIRED = "EXPIRED",
}
