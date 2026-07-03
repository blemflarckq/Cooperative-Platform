export type JournalEntryStatus = "DRAFT" | "POSTED" | "REVERSED";
export type JournalLineType = "DEBIT" | "CREDIT";

export interface JournalLine {
  id: string;
  accountId: string;
  account?: {
    id: string;
    code: string;
    name: string;
  };
  lineType: JournalLineType;
  amount: string;
  memo?: string | null;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  entryNumber: string;
  transactionDate: string;
  description: string;
  sourceModule: string;
  sourceReference?: string | null;
  status: JournalEntryStatus;
  lines: JournalLine[];
  createdAt: string;
  updatedAt: string;
}

export interface ManualJournalLineInput {
  accountId: string;
  lineType: JournalLineType;
  amount: string;
  memo?: string;
}

export interface ManualJournalEntryRequest {
  transactionDate: string;
  description: string;
  sourceReference?: string;
  lines: ManualJournalLineInput[];
}

export interface ReverseJournalEntryRequest {
  reason: string;
}