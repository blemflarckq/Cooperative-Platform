/**
 * Lifecycle of a loan.
 *
 * PENDING_PLEDGES  → has a peer-funded tranche still awaiting enough
 *                    member pledges to cover it (self-funded-only loans
 *                    skip this state entirely).
 * PENDING_APPROVAL → fully pledged (or fully self-funded), waiting on the
 *                    2-approver outbound request before disbursement.
 * ACTIVE           → disbursed, being repaid.
 * AT_RISK          → peer-funded rate hit its cap and this scheme's policy
 *                    is FLAG_AND_BLOCK — borrower is blocked from new
 *                    loans until this one is fully repaid.
 * REPAID           → fully settled.
 */
export enum LoanStatus {
  PENDING_PLEDGES = "PENDING_PLEDGES",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  AT_RISK = "AT_RISK",
  REPAID = "REPAID",
}

/**
 * What happens once the peer-funded interest rate reaches its cap and
 * would otherwise need to escalate again — a real policy choice, not a
 * platform-wide rule, so it's configured per scheme via LoanPolicy.
 */
export enum AtCapBehavior {
  CONTINUE_AT_CAP = "CONTINUE_AT_CAP",
  FLAG_AND_BLOCK = "FLAG_AND_BLOCK",
}
