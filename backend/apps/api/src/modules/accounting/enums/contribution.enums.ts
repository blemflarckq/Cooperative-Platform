export enum ContributionStatus {
  POSTED = "POSTED",
  REVERSED = "REVERSED",
}

export enum ContributionSource {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  MOBILE_MONEY = "MOBILE_MONEY",
  OTHER = "OTHER",
  /**
   * Interest credited to a member's own savings balance from a loan they
   * either self-funded or pledged toward — not a real external payment,
   * but recorded as a Contribution so it flows into the same balance
   * calculations (MemberBalanceService) as any other contribution,
   * without needing a second, parallel "member balance" mechanism.
   */
  LOAN_INTEREST_CREDIT = "LOAN_INTEREST_CREDIT",
}