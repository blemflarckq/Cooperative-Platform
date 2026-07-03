export interface AccountingSummary {
  dateFrom?: string;
  dateTo?: string;
  totals: {
    assets: string;
    liabilities: string;
    equity: string;
    income: string;
    expenses: string;
    netIncome: string;
  };
}

export interface TrialBalanceLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitTotal: string;
  creditTotal: string;
  balance: string;
}

export interface TrialBalance {
  dateFrom?: string;
  dateTo?: string;
  totals: {
    debitTotal: string;
    creditTotal: string;
    difference: string;
  };
  lines: TrialBalanceLine[];
}

export interface AccountLedgerLine {
  journalEntryId: string;
  entryNumber: string;
  transactionDate: string;
  description: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

export interface AccountLedger {
  accountId: string;
  accountCode: string;
  accountName: string;
  dateFrom?: string;
  dateTo?: string;
  lines: AccountLedgerLine[];
}