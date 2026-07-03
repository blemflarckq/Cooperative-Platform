import { JournalEntry } from "../entities/journal-entry.entity";

export class JournalEntryResponseMapper {
  static toResponse(entry: JournalEntry) {
    return {
      id: entry.id,
      tenantId: entry.tenantId,
      entryNumber: entry.entryNumber,
      transactionDate: entry.transactionDate,
      description: entry.description,
      status: entry.status,
      sourceModule: entry.sourceModule,
      sourceReference: entry.sourceReference,
      postedByUserId: entry.postedByUserId,
      postedAt: entry.postedAt,
      reversedEntryId: entry.reversedEntryId,
      reversedAt: entry.reversedAt,
      reversedByUserId: entry.reversedByUserId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,

      lines:
        entry.lines?.map((line) => ({
          id: line.id,
          accountId: line.accountId,
          lineType: line.lineType,
          amount: line.amount,
          memo: line.memo,
          account: line.account
            ? {
                id: line.account.id,
                code: line.account.code,
                name: line.account.name,
                type: line.account.type,
                normalBalance: line.account.normalBalance,
              }
            : undefined,
        })) ?? [],
    };
  }

  static toList(entries: JournalEntry[]) {
    return entries.map((entry) => this.toResponse(entry));
  }
}