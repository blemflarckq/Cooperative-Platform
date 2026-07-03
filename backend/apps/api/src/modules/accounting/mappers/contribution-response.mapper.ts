import { Contribution } from "../entities/contribution.entity";

export class ContributionResponseMapper {
  static toResponse(contribution: Contribution) {
    const tenantUser = contribution.tenantUser;
    const user = tenantUser?.user;

    return {
      id: contribution.id,
      tenantId: contribution.tenantId,
      cycleId: contribution.cycleId,
      tenantUserId: contribution.tenantUserId,
      reference: contribution.reference,
      contributionDate: contribution.contributionDate,
      amount: contribution.amount,
      source: contribution.source,
      status: contribution.status,
      journalEntryId: contribution.journalEntryId,
      notes: contribution.notes,
      reversedJournalEntryId: contribution.reversedJournalEntryId,
      reversedAt: contribution.reversedAt,
      reversedByUserId: contribution.reversedByUserId,
      createdAt: contribution.createdAt,
      updatedAt: contribution.updatedAt,
      tenantUser: tenantUser
        ? {
            id: tenantUser.id,
            status: tenantUser.status,
            user: user
              ? {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                }
              : undefined,
          }
        : undefined,
      journalEntry: contribution.journalEntry
        ? {
            id: contribution.journalEntry.id,
            entryNumber: contribution.journalEntry.entryNumber,
            status: contribution.journalEntry.status,
          }
        : undefined,
    };
  }

  static toList(contributions: Contribution[]) {
    return contributions.map((contribution) => this.toResponse(contribution));
  }
}